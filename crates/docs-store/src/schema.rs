//! The shape the site keeps its content in.
//!
//! Written once at start and safe to re-run, because every statement carries
//! `IF NOT EXISTS`. A deployment that restarts is not a deployment that has to
//! remember whether it has run this before.
//!
//! # The one decision worth reading
//!
//! The ranking comes from ONE place, the `site` search, and nothing merges two
//! scores: two scores drawn from two indexes measure against two different
//! collections, so one ordering made of both has numbers that do not mean what
//! they appear to. `site` ranks the page title, the heading and the passage as
//! three fields of one document with one set of statistics (BM25F), which is
//! what used to need them composed into one `text` field — and weighs them
//! apart, which that composition could not.
//!
//! `fragment.text` keeps its field index for the unranked fallbacks (a word
//! being typed, a word misspelled), which ask *which* fragments match and never
//! *how well*. The `words` search exists for type-ahead and ranks nothing.
//!
//! # Why the analyzer is named after a language and cannot be edited in place
//!
//! An analyzer's **name is unique across the store**, not per database — it
//! describes a language rather than a tenant's data. Two consequences, and both
//! decide the shape of this file rather than merely decorating it.
//!
//! Adding a filter to an analyzer that is already declared does nothing:
//! `IF NOT EXISTS` finds the name and returns, so the definition in force is
//! still the old one and every read looks exactly as it did. And redefining one
//! in place would leave the postings already written describing text that
//! tokenises differently today — an index that quietly stops matching.
//!
//! So a change to the filter chain is a **new analyzer name in a new
//! namespace**, which is the same mechanism a released version already uses.
//! The name says what the chain does: `english` stems, and stemming is
//! English-only here.

/// A record id is spelled into a statement rather than bound, so the characters
/// allowed in a slug are fixed here and checked before anything is written.
///
/// Slugs come from file paths under this repository's control and from
/// [`docs_content::slug`], which emits only lowercase alphanumerics and hyphens.
/// The check is kept anyway: "the input is trusted" is the assumption every
/// injection begins with, and the cost of holding the line here is one pass over
/// a short string.
#[must_use]
pub fn is_safe_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.len() <= 512
        && slug
            .chars()
            .all(|character| character.is_alphanumeric() || matches!(character, '-' | '_' | '/'))
}

/// `DEFINE NAMESPACE`, on its own.
///
/// Separate from [`statements`] because it is the one part of the schema that
/// needs authority over the **store** rather than over this namespace, and the
/// account this server runs as is deliberately narrower than that.
///
/// A namespace is a sibling of every other namespace, so declaring one is not
/// shaping the data you own — the engine reserves it for an owner holding no
/// tenancy of their own. Asking for it on every start would mean asking for
/// authority this server should not have, and getting a refusal in the ordinary
/// case where the namespace is already there.
///
/// So the caller asks first and only declares what is missing. See
/// [`Store::migrate`](crate::Store::migrate).
#[must_use]
pub fn define_namespace(namespace: &str) -> String {
    format!("DEFINE NAMESPACE IF NOT EXISTS {namespace};")
}

/// Every statement the site's schema is made of, in order.
///
/// `namespace` is the version this doc set belongs to — a namespace per released
/// version, so switching version is switching namespace and an old version is
/// never a filter somebody forgets to apply.
///
/// The namespace itself is **not** here — see [`define_namespace`].
#[must_use]
pub fn statements(namespace: &str) -> String {
    format!(
        "USE NAMESPACE {namespace};
DEFINE DATABASE IF NOT EXISTS docs;
USE DATABASE docs;

-- `lowercase` and `ascii` make two spellings of a word one term. `stemmer` is
-- the one that makes two *words* one term, and without it a reader searching
-- `backups` was told this site has nothing about backups. It is written last
-- because Porter2 is defined over lower-case words and declines to half-stem
-- anything else.
DEFINE ANALYZER IF NOT EXISTS english FILTERS lowercase, ascii, stemmer;

DEFINE COLLECTION IF NOT EXISTS section;
DEFINE COLLECTION IF NOT EXISTS page;
DEFINE COLLECTION IF NOT EXISTS fragment;
DEFINE TABLE IF NOT EXISTS holds EDGE;
DEFINE BUCKET IF NOT EXISTS asset;

-- Who may edit this site, which is a different question from who may reach the
-- database. The store's own users are two service accounts — a viewer the read
-- routes run as and an editor the write routes run as — and neither of them is
-- a person. A person is a row here.
--
-- `account.secret` is an Argon2id PHC string. `token`'s record id is the
-- SHA-256 of the token that was handed out, so this table holds nothing that
-- can be presented to anything: a dump of it is a list of expiry times.
DEFINE COLLECTION IF NOT EXISTS account;
DEFINE COLLECTION IF NOT EXISTS token;

DEFINE FIELD IF NOT EXISTS text ON fragment TYPE string ANALYZER english;
DEFINE INDEX IF NOT EXISTS by_text ON fragment FIELDS text SEARCH;

-- The ranked search reads `site`: title, heading and passage as three fields
-- of one document, weighted against each other (BM25F), so a page ABOUT a word
-- outranks a page that mentions it. Weighed on a judgment set of 35 real
-- queries: the title at 10 and the heading at 3 put the right page first for
-- 29 of them where the single `text` field did for 21. `body` is the one field
-- a snippet window is taken from, because it is the one shown under a result.
DEFINE STOPWORDS IF NOT EXISTS common ['a', 'an', 'the', 'of', 'to', 'in', 'on', 'and', 'or', 'is', 'it', 'how', 'do', 'i', 'what'];
DEFINE SEARCH IF NOT EXISTS site ON fragment FIELDS title WEIGHT 10, heading WEIGHT 3, body SNIPPET ANALYZER english STOPWORDS common;

-- Type-ahead reads `words`, which is NOT stemmed: it offers words a reader
-- would type, and a stemming analyzer would offer `analyz`.
DEFINE ANALYZER IF NOT EXISTS plain FILTERS lowercase, ascii;
DEFINE SEARCH IF NOT EXISTS words ON fragment FIELDS title, heading, body ANALYZER plain;
"
    )
}

/// Selecting the namespace and database on a connection that is already open.
#[must_use]
pub fn use_namespace(namespace: &str) -> String {
    format!("USE NAMESPACE {namespace};\nUSE DATABASE docs;\n")
}

#[cfg(test)]
mod tests {
    use super::{define_namespace, is_safe_slug, statements, use_namespace};

    #[test]
    fn a_slug_that_could_close_a_quoted_id_is_refused() {
        // The property that lets a record id be spelled into a statement at all.
        assert!(!is_safe_slug("query'; DELETE FROM page; --"));
        assert!(!is_safe_slug("has space"));
        assert!(!is_safe_slug("quote'inside"));
        assert!(!is_safe_slug(""));
    }

    #[test]
    fn the_slugs_this_project_actually_produces_are_accepted() {
        assert!(is_safe_slug("query-language/full-text-search"));
        assert!(is_safe_slug("index"));
        assert!(is_safe_slug("sdk/rust_client"));
        assert!(is_safe_slug("запросы/поиск"));
    }

    #[test]
    fn every_definition_is_re_runnable_so_a_restart_is_not_a_special_case() {
        let script = statements("v0_0_3_alpha");
        for line in script.lines() {
            let line = line.trim();
            if line.starts_with("DEFINE") {
                assert!(
                    line.contains("IF NOT EXISTS"),
                    "a restart would fail on: {line}"
                );
            }
        }
    }

    #[test]
    fn the_only_analyzed_field_is_the_only_indexed_one() {
        // If these ever disagree, ranking silently stops meaning what the search
        // route says it means. Cheaper to assert than to notice in production.
        let script = statements("v1");
        assert!(
            script.contains(
                "DEFINE FIELD IF NOT EXISTS text ON fragment TYPE string ANALYZER english"
            )
        );
        assert!(
            script.contains("DEFINE INDEX IF NOT EXISTS by_text ON fragment FIELDS text SEARCH")
        );
        // Exactly one field is analyzed and exactly one index searches, and they
        // are the same field. A second analyzed field would be the drift this
        // asserts against: it would look harmless and would quietly make two
        // scores that cannot be ordered against each other.
        let analyzed: Vec<&str> = script
            .lines()
            .filter(|line| line.starts_with("DEFINE FIELD") && line.contains("ANALYZER"))
            .collect();
        assert_eq!(analyzed.len(), 1, "{analyzed:?}");
        let searched: Vec<&str> = script
            .lines()
            .filter(|line| line.starts_with("DEFINE INDEX") && line.contains("SEARCH"))
            .collect();
        assert_eq!(searched.len(), 1, "{searched:?}");
        assert!(analyzed[0].contains("text ON fragment"));
        assert!(searched[0].contains("ON fragment FIELDS text"));
    }

    #[test]
    fn what_ranks_names_an_analyzer_this_script_declares_and_it_stems() {
        // The failure this asserts against shipped: the chain was
        // `lowercase, ascii`, so `backups` found nothing while `backup` found
        // twenty pages — no error, no empty index, just a smaller answer than
        // the one asked for. And because an analyzer's name is unique across the
        // store, a field pointing at a name declared under some *other*
        // namespace's chain would look identical to this one from here.
        //
        // Two analyzers are declared since type-ahead arrived, and that is the
        // point the guard now has to hold precisely: the one that RANKS — named
        // by the analyzed field and by the `site` search — stems, and the
        // unstemmed one is used by the type-ahead search alone, which ranks
        // nothing and must offer words a reader would type.
        let script = statements("v1");
        let ranking = "english";
        assert!(
            script.contains(&format!("ON fragment TYPE string ANALYZER {ranking};")),
            "the analyzed field names something other than {ranking}"
        );
        let site = script
            .lines()
            .find(|line| line.starts_with("DEFINE SEARCH IF NOT EXISTS site "))
            .expect("the site search");
        assert!(site.contains(&format!("ANALYZER {ranking} ")), "{site}");
        let declared = script
            .lines()
            .find(|line| line.starts_with(&format!("DEFINE ANALYZER IF NOT EXISTS {ranking} ")))
            .expect("the ranking analyzer is declared here");
        assert!(declared.contains("stemmer"), "{declared}");
        // `lowercase` before `stemmer`, or Porter2 returns the word untouched
        // rather than stemming it — a chain that reads right and does nothing.
        let chain = declared.split_once("FILTERS ").expect("a filter chain").1;
        assert!(chain.find("lowercase") < chain.find("stemmer"), "{chain}");
        // Every other analyzer is named by the type-ahead search and by nothing
        // that ranks.
        for other in script.lines().filter(|line| {
            line.starts_with("DEFINE ANALYZER") && !line.contains(&format!(" {ranking} "))
        }) {
            let name = other.split_whitespace().nth(5).expect("a name");
            let users: Vec<&str> = script
                .lines()
                .filter(|line| {
                    line.contains(&format!("ANALYZER {name}"))
                        && !line.starts_with("DEFINE ANALYZER")
                })
                .collect();
            assert!(
                users
                    .iter()
                    .all(|line| line.starts_with("DEFINE SEARCH IF NOT EXISTS words ")),
                "{name} is used by something that ranks: {users:?}"
            );
        }
    }

    #[test]
    fn the_namespace_is_the_version() {
        assert!(define_namespace("v0_2_0").contains("DEFINE NAMESPACE IF NOT EXISTS v0_2_0"));
        assert!(
            !statements("v0_2_0").contains("DEFINE NAMESPACE"),
            "the schema must not ask for store-wide authority on every start"
        );
        assert_eq!(
            use_namespace("v0_2_0"),
            "USE NAMESPACE v0_2_0;\nUSE DATABASE docs;\n"
        );
    }
}
