//! A release's documentation kept in a namespace of its own, against a node.
//!
//! Point `DOCS_TEST_NODE` at a node, as for `against_a_node.rs`:
//!
//! ```text
//! tessaridb /tmp/store --serve 127.0.0.1:47920
//! DOCS_TEST_NODE=127.0.0.1:47920 cargo test -p docs-store --test archives
//! ```
//!
//! With the variable unset they report that they did not run.

#![allow(clippy::unwrap_used, clippy::panic, clippy::expect_used)]

use docs_content::parse;
use docs_store::{Store, ingest::Corpus, ingest::Section};

/// One test at a time on the node, for the reason `against_a_node.rs` gives:
/// each one declares namespaces and rewrites whole tables. A tokio mutex,
/// because the guard is held across every `.await` of the test by design.
static NODE: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

async fn live(namespace: &str) -> Option<(Store, tokio::sync::MutexGuard<'static, ()>)> {
    let address = std::env::var("DOCS_TEST_NODE").ok()?;
    let alone = NODE.lock().await;
    let mut store = Store::connect(&address, namespace, None)
        .await
        .expect("connect to the node named by DOCS_TEST_NODE");
    store.migrate().await.expect("the schema applies");
    Some((store, alone))
}

fn corpus(body: &str) -> Corpus {
    let search = parse(
        "query-language/search",
        &format!(
            "+++\ntitle = \"Full-text search\"\nsummary = \"Terms, not patterns.\"\norder = 40\n+++\n\n{body}\n\n## Analyzers\n\nAn analyzer belongs to the field.\n"
        ),
    )
    .expect("a page");
    let home = parse("index", "+++\ntitle = \"Home\"\n+++\n\nThe front door.\n").expect("a page");
    let nested = parse(
        "query-language/reads/paging",
        "+++\ntitle = \"Paging\"\norder = 5\nunreleased = true\n+++\n\nA cursor, not an offset.\n",
    )
    .expect("a page");
    Corpus {
        sections: vec![
            Section {
                slug: "query-language".to_owned(),
                title: "TessariQL".to_owned(),
                parent: None,
                order: 10,
                icon: Some("terminal".to_owned()),
            },
            Section {
                slug: "query-language/reads".to_owned(),
                title: "Reads".to_owned(),
                parent: Some("query-language".to_owned()),
                order: 20,
                icon: None,
            },
        ],
        pages: vec![search, home, nested],
    }
}

#[tokio::test]
async fn an_archive_is_the_live_site_as_it_stood_and_stays_so() {
    let Some((mut store, _alone)) = live("t_arch_live").await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    store
        .ingest(&corpus("Words as they were."))
        .await
        .expect("ingest");

    let archived = store
        .archive("9.9.0-test", "t_arch_v9_9_0")
        .await
        .expect("archive");
    assert_eq!(archived.pages, 3, "{archived:?}");
    assert_eq!(archived.sections, 2, "{archived:?}");

    // The live site moves on; the archive must not.
    store
        .ingest(&corpus("Words as they are now."))
        .await
        .expect("ingest again");

    let namespace = store
        .namespace_of("9.9.0-test")
        .await
        .expect("a read")
        .expect("the label is recorded");
    assert_eq!(namespace, "t_arch_v9_9_0");

    store.switch(&namespace).await.expect("switch");
    let old = store
        .article("query-language/search")
        .await
        .expect("a read")
        .expect("the archived page");
    assert!(
        old.markdown.contains("Words as they were."),
        "{}",
        old.markdown
    );
    assert_eq!(old.summary.as_deref(), Some("Terms, not patterns."));
    let paging = store
        .article("query-language/reads/paging")
        .await
        .expect("a read")
        .expect("the nested page");
    assert!(
        paging.unreleased,
        "the unreleased mark travels with the page"
    );

    // The tree is the archive's own, levels intact.
    let tree = store.tree().await.expect("the tree");
    assert_eq!(tree.len(), 1, "{tree:?}");
    let root = tree.first().expect("a root");
    assert_eq!(root.slug, "query-language");
    assert!(
        root.children
            .iter()
            .any(|child| child.slug == "query-language/reads"
                && child
                    .children
                    .iter()
                    .any(|leaf| leaf.slug == "query-language/reads/paging")),
        "{root:?}"
    );

    // Search answers from the archive's own index, not the live one.
    let hits = store.search("were", 10).await.expect("search");
    assert!(
        hits.iter().any(|hit| hit.page == "query-language/search"),
        "{hits:?}"
    );
    let now = store.search("now", 10).await.expect("search");
    assert!(
        now.iter().all(|hit| hit.page != "query-language/search"),
        "the archive answered with the live site's words: {now:?}"
    );
}

#[tokio::test]
async fn archiving_a_label_again_replaces_it_rather_than_doubling_it() {
    let Some((mut store, _alone)) = live("t_arch_again").await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    store.ingest(&corpus("First.")).await.expect("ingest");
    store
        .archive("9.8.0", "t_arch_v9_8_0")
        .await
        .expect("archive");
    store.ingest(&corpus("Second.")).await.expect("ingest");
    let again = store
        .archive("9.8.0", "t_arch_v9_8_0")
        .await
        .expect("archive again");
    assert_eq!(again.pages, 3, "{again:?}");

    let versions = store.versions().await.expect("versions");
    assert_eq!(
        versions
            .iter()
            .filter(|version| version.label == "9.8.0")
            .count(),
        1,
        "{versions:?}"
    );
    store.switch("t_arch_v9_8_0").await.expect("switch");
    assert_eq!(store.pages_held().await.expect("count"), 3);
    let page = store
        .article("query-language/search")
        .await
        .expect("a read")
        .expect("the page");
    assert!(page.markdown.contains("Second."), "{}", page.markdown);
}

#[tokio::test]
async fn versions_come_back_newest_first_and_an_unknown_label_is_none() {
    let Some((mut store, _alone)) = live("t_arch_order").await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    store.ingest(&corpus("Any.")).await.expect("ingest");
    store
        .archive("0.9.0-beta", "t_arch_v0_9_0_beta")
        .await
        .expect("archive");
    store
        .archive("0.10.0-beta", "t_arch_v0_10_0_beta")
        .await
        .expect("archive");
    store
        .archive("0.10.0", "t_arch_v0_10_0")
        .await
        .expect("archive");

    let labels: Vec<String> = store
        .versions()
        .await
        .expect("versions")
        .into_iter()
        .map(|version| version.label)
        .collect();
    assert_eq!(labels, ["0.10.0", "0.10.0-beta", "0.9.0-beta"]);

    assert!(store.namespace_of("1.2.3").await.expect("a read").is_none());
    assert!(
        store
            .namespace_of("x' OR true --")
            .await
            .expect("a read")
            .is_none(),
        "a label that could not be one is simply not a version"
    );
}

#[tokio::test]
async fn an_archive_into_an_unusable_namespace_is_refused_before_anything_is_written() {
    let Some((mut store, _alone)) = live("t_arch_refuse").await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    store.ingest(&corpus("Any.")).await.expect("ingest");
    assert!(store.archive("1.0.0", "x; DROP").await.is_err());
    assert!(store.archive("1.0.0'", "t_arch_ok").await.is_err());
    assert!(
        store.archive("1.0.0", "t_arch_refuse").await.is_err(),
        "into itself"
    );
    assert!(store.versions().await.expect("versions").is_empty());

    // Refused BEFORE anything was written: the store would refuse the bad label
    // too, but only after the pages had been copied.
    let filled = match store.switch("t_arch_ok").await {
        Ok(()) => store.pages_held().await.unwrap_or(0),
        Err(_) => 0,
    };
    assert_eq!(filled, 0, "pages were copied for a label that was refused");
}
