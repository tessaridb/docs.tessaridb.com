//! Releases kept apart: each archived version in a namespace of its own, and the
//! list in the live namespace that names them.
//!
//! # Why a namespace per release and not a `version` field on every record
//!
//! A field would put every release in one search index, and every read would
//! carry a predicate the store must re-test — the ranked search included, whose
//! statistics would then be the statistics of all releases at once. A namespace
//! gives each release its own records, its own index and its own scores, and the
//! site's code reads one exactly as it reads the live one.
//!
//! # Why the archive is copied from the store and not from `content/`
//!
//! `content/` is not in git and moves ahead of a release while the next one is
//! written. The store holds what readers were actually shown, so that is what is
//! kept. Fragments are not copied as rows: they are cut again from each page's
//! Markdown by the same splitter the live site used, so an archive is
//! searchable by construction rather than by a copy staying faithful.
//!
//! # What is not copied
//!
//! The `asset` bucket, the `account` and `token` tables. An archive is read and
//! never edited, so it has no editors, and the site holds no assets.

use std::cmp::Ordering;

use docs_content::Page;
use docs_content::front::FrontMatter;
use tessaridb_client::Value;

use crate::ingest::{Corpus, Section, Written, check};
use crate::{Fault, Store, number_of, records, schema, text, text_of};

/// One archived release.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Version {
    /// What a reader sees and what the URL carries: `0.32.0-beta`.
    pub label: String,
    /// Where its pages are. Not sent to a browser — the label is the address.
    #[serde(skip)]
    pub namespace: String,
}

/// Whether a label can name a release in a URL and inside a quoted record id.
///
/// A version string and nothing else: a digit first, then digits, letters, dots
/// and hyphens. Narrower than anything the store's lexer would accept, which is
/// the point — a label arrives from a URL.
#[must_use]
pub fn is_safe_label(label: &str) -> bool {
    label.len() <= 40
        && label.starts_with(|first: char| first.is_ascii_digit())
        && label
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-'))
}

/// Whether a name can be spelled into `USE NAMESPACE` as it stands.
#[must_use]
pub fn is_safe_namespace(namespace: &str) -> bool {
    namespace.len() <= 64
        && namespace.starts_with(|first: char| first.is_ascii_lowercase())
        && namespace.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '_'
        })
}

/// The namespace a release is kept in when none is named: `0.32.0-beta` is
/// kept in `v0_32_0_beta`.
#[must_use]
pub fn namespace_for(label: &str) -> String {
    let mut namespace = String::with_capacity(label.len().saturating_add(1));
    namespace.push('v');
    for character in label.chars() {
        namespace.push(match character {
            '.' | '-' => '_',
            other => other.to_ascii_lowercase(),
        });
    }
    namespace
}

/// Release order: `0.10.0` after `0.9.0`, and a release after its own
/// pre-releases (`0.10.0` after `0.10.0-beta`).
///
/// String order gets both wrong, and so does the order of archiving — a fix to
/// an old release's pages is archived after the newer release was.
#[must_use]
pub fn precedence(left: &str, right: &str) -> Ordering {
    let (left_core, left_pre) = split_label(left);
    let (right_core, right_pre) = split_label(right);
    left_core
        .cmp(&right_core)
        .then_with(|| match (left_pre, right_pre) {
            (None, None) => Ordering::Equal,
            (None, Some(_)) => Ordering::Greater,
            (Some(_), None) => Ordering::Less,
            (Some(left), Some(right)) => left.cmp(right),
        })
}

fn split_label(label: &str) -> (Vec<u64>, Option<&str>) {
    let (core, pre) = match label.split_once('-') {
        Some((core, pre)) => (core, Some(pre)),
        None => (label, None),
    };
    let numbers = core
        .split('.')
        .map(|part| part.parse::<u64>().unwrap_or(0))
        .collect();
    (numbers, pre)
}

impl Store {
    /// Every archived release, newest first.
    ///
    /// # Errors
    ///
    /// [`Fault::Client`] when the node refuses.
    pub async fn versions(&mut self) -> Result<Vec<Version>, Fault> {
        let answers = self.run("SELECT * FROM version;").await?;
        let mut versions: Vec<Version> = records(answers.first())?
            .iter()
            .map(|(_, value)| Version {
                label: text_of(value, "label"),
                namespace: text_of(value, "namespace"),
            })
            .filter(|version| {
                is_safe_label(&version.label) && is_safe_namespace(&version.namespace)
            })
            .collect();
        versions.sort_by(|left, right| precedence(&right.label, &left.label));
        Ok(versions)
    }

    /// The namespace an archived release lives in, or `None` when no release
    /// carries that label — including a label that could not be one.
    ///
    /// The label is a **bound value** here, not spelled into the statement: it
    /// arrives from a URL.
    ///
    /// # Errors
    ///
    /// [`Fault::Client`] when the node refuses, and [`Fault::UnsafeNamespace`]
    /// when the recorded namespace could not be selected safely.
    pub async fn namespace_of(&mut self, label: &str) -> Result<Option<String>, Fault> {
        if !is_safe_label(label) {
            return Ok(None);
        }
        let answers = self
            .run_with(
                "SELECT * FROM version WHERE label = $label;",
                vec![("label".to_owned(), text(label))],
            )
            .await?;
        let Some((_, value)) = records(answers.first())?.first() else {
            return Ok(None);
        };
        let namespace = text_of(value, "namespace");
        if is_safe_namespace(&namespace) {
            Ok(Some(namespace))
        } else {
            Err(Fault::UnsafeNamespace(namespace))
        }
    }

    /// The site as this namespace holds it, rebuilt as a [`Corpus`].
    ///
    /// # Errors
    ///
    /// [`Fault::Client`] when the node refuses and [`Fault::UnsafeSlug`] for a
    /// stored slug that could not be spelled into an id.
    pub async fn corpus(&mut self) -> Result<Corpus, Fault> {
        let answers = self
            .run("SELECT * FROM section;\nSELECT * FROM page;")
            .await?;
        let mut sections: Vec<Section> = records(answers.first())?
            .iter()
            .map(|(_, value)| Section {
                slug: text_of(value, "slug"),
                title: text_of(value, "title"),
                parent: None,
                order: number_of(value, "order"),
                icon: present(text_of(value, "icon")),
            })
            .collect();
        let mut pages: Vec<Page> = records(answers.get(1))?
            .iter()
            .map(|(_, value)| page_of(value))
            .collect();

        for section in &sections {
            check(&section.slug)?;
        }
        for page in &pages {
            check(&page.slug)?;
        }

        // Which section holds what is an edge, not a field, so it is read the
        // way the tree reads it.
        let mut held_sections = Vec::new();
        let mut held_pages = Vec::new();
        for section in &sections {
            let answers = self
                .run(&format!(
                    "SELECT slug FROM section:'{slug}'->holds->section;\nSELECT slug FROM section:'{slug}'->holds->page;",
                    slug = section.slug
                ))
                .await?;
            for (_, value) in records(answers.first())? {
                held_sections.push((text_of(value, "slug"), section.slug.clone()));
            }
            for (_, value) in records(answers.get(1))? {
                held_pages.push((text_of(value, "slug"), section.slug.clone()));
            }
        }
        for section in &mut sections {
            section.parent = held_sections
                .iter()
                .find(|(child, _)| *child == section.slug)
                .map(|(_, parent)| parent.clone());
        }
        for page in &mut pages {
            page.front.section = held_pages
                .iter()
                .find(|(child, _)| *child == page.slug)
                .map(|(_, parent)| parent.clone());
        }
        Ok(Corpus { sections, pages })
    }

    /// Keeps this namespace's site as release `label`, in namespace `into`.
    ///
    /// The copy is read back and compared page by page before the release is
    /// listed, so a release that is listed is one that was kept whole.
    /// Archiving a label again replaces what it held, so a fix to a release's
    /// pages can be archived over it. The connection is pointed back at the
    /// namespace it started in, whatever happens.
    ///
    /// Needs authority over the store: it declares a namespace.
    ///
    /// # Errors
    ///
    /// [`Fault::UnsafeVersion`] or [`Fault::UnsafeNamespace`] before anything is
    /// written, [`Fault::ArchiveDiffers`] when the copy read back differs, and
    /// [`Fault::Client`] when the node refuses.
    pub async fn archive(&mut self, label: &str, into: &str) -> Result<Written, Fault> {
        if !is_safe_label(label) {
            return Err(Fault::UnsafeVersion);
        }
        if !is_safe_namespace(into) || into == self.namespace() {
            return Err(Fault::UnsafeNamespace(into.to_owned()));
        }
        let live = self.namespace().to_owned();
        let corpus = self.corpus().await?;

        let copied = self.fill(into, &corpus).await;
        self.switch(&live).await?;
        let (written, kept) = copied?;
        let differing = differences(&corpus, &kept);
        if !differing.is_empty() {
            return Err(Fault::ArchiveDiffers(differing.join(", ")));
        }

        // Declared here as well as in the schema: a deployed API applies the
        // schema as an editor, which may be refused a definition, and this runs
        // as the store's owner.
        self.run_with(
            &format!(
                "DEFINE COLLECTION IF NOT EXISTS version;\nDELETE version:'{label}';\nCREATE version:'{label}' = {{ label: $label, namespace: $namespace, archived_at: time::now() }};"
            ),
            vec![
                ("label".to_owned(), text(label)),
                ("namespace".to_owned(), text(into)),
            ],
        )
        .await?;
        log::info!(
            "archived {live} as {label} in {into}: {} sections, {} pages, {} fragments",
            written.sections,
            written.pages,
            written.fragments
        );
        Ok(written)
    }

    /// Writes the archive, then reads it back as a corpus to compare.
    async fn fill(&mut self, into: &str, corpus: &Corpus) -> Result<(Written, Corpus), Fault> {
        self.run(&schema::define_namespace(into)).await?;
        self.run(&schema::statements(into)).await?;
        self.switch(into).await?;
        let written = self.ingest(corpus).await?;
        let kept = self.corpus().await?;
        Ok((written, kept))
    }
}

/// Every page and section whose stored form differs between two corpora.
///
/// Fragments are compared too: both sides cut them from the same Markdown, so a
/// difference there is a difference in what was stored.
fn differences(left: &Corpus, right: &Corpus) -> Vec<String> {
    let mut differing = Vec::new();
    for page in &left.pages {
        if right.pages.iter().find(|other| other.slug == page.slug) != Some(page) {
            differing.push(page.slug.clone());
        }
    }
    for section in &left.sections {
        if right
            .sections
            .iter()
            .find(|other| other.slug == section.slug)
            != Some(section)
        {
            differing.push(section.slug.clone());
        }
    }
    if left.pages.len() != right.pages.len() || left.sections.len() != right.sections.len() {
        differing.push(format!(
            "{} pages and {} sections copied, {} and {} kept",
            left.pages.len(),
            left.sections.len(),
            right.pages.len(),
            right.sections.len()
        ));
    }
    differing
}

fn page_of(value: &Value) -> Page {
    let title = text_of(value, "title");
    let markdown = text_of(value, "markdown");
    let (headings, fragments) = docs_content::fragment::split(&title, &markdown);
    Page {
        slug: text_of(value, "slug"),
        front: FrontMatter {
            title: title.clone(),
            summary: present(text_of(value, "summary")),
            section: None,
            order: number_of(value, "order"),
            icon: None,
            unreleased: matches!(
                value,
                Value::Object(fields) if matches!(fields.get("unreleased"), Some(Value::Bool(true)))
            ),
        },
        title,
        markdown,
        headings,
        fragments,
    }
}

fn present(text: String) -> Option<String> {
    (!text.is_empty()).then_some(text)
}

#[cfg(test)]
mod tests {
    use std::cmp::Ordering;

    use super::{is_safe_label, is_safe_namespace, precedence};

    #[test]
    fn a_label_is_a_version_string_and_nothing_that_could_close_a_quote() {
        assert!(is_safe_label("0.32.0-beta"));
        assert!(is_safe_label("1.0.0"));
        assert!(!is_safe_label("v1.0.0"), "a digit first");
        assert!(!is_safe_label("1.0.0'"));
        assert!(!is_safe_label("1.0 .0"));
        assert!(!is_safe_label("../etc"));
        assert!(!is_safe_label(""));
        assert!(!is_safe_label(&"1".repeat(41)));
    }

    #[test]
    fn a_namespace_is_lower_case_letters_digits_and_underscores() {
        assert!(is_safe_namespace("v0_32_0_beta"));
        assert!(!is_safe_namespace("V0"));
        assert!(!is_safe_namespace("0v"));
        assert!(!is_safe_namespace("v0; DROP"));
        assert!(!is_safe_namespace(""));
    }

    #[test]
    fn a_release_is_kept_in_a_namespace_named_after_it() {
        assert_eq!(super::namespace_for("0.32.0-beta"), "v0_32_0_beta");
        assert_eq!(super::namespace_for("1.0.0-RC.1"), "v1_0_0_rc_1");
        assert!(is_safe_namespace(&super::namespace_for("0.32.0-beta")));
    }

    #[test]
    fn releases_order_by_number_and_a_release_follows_its_pre_releases() {
        assert_eq!(precedence("0.10.0", "0.9.0"), Ordering::Greater);
        assert_eq!(precedence("0.10.0", "0.10.0-beta"), Ordering::Greater);
        assert_eq!(precedence("0.10.0-beta", "0.10.0-alpha"), Ordering::Greater);
        assert_eq!(precedence("0.32.1-beta", "0.32.0-beta"), Ordering::Greater);
        assert_eq!(precedence("1.0.0", "1.0.0"), Ordering::Equal);
    }
}
