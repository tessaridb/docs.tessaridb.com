//! An archived release read through the real routes, against a real store.
//!
//! ```text
//! tessaridb /tmp/store --serve 127.0.0.1:47920
//! DOCS_TEST_NODE=127.0.0.1:47920 cargo test -p docs-server --test versions
//! ```

#![allow(clippy::unwrap_used, clippy::panic, clippy::expect_used)]

use axum::body::Body;
use axum::http::{Request, StatusCode};
use docs_content::parse;
use docs_server::Site;
use docs_store::ingest::{Corpus, Section};
use tower::ServiceExt;

static NODE: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn corpus(words: &str) -> Corpus {
    let page = parse(
        "guide/start",
        &format!(
            "+++\ntitle = \"Start\"\n+++\n\n{words}\n\n## Next\n\nSee [paging](/guide/paging).\n"
        ),
    )
    .expect("a page");
    Corpus {
        sections: vec![Section {
            slug: "guide".to_owned(),
            title: "Guide".to_owned(),
            parent: None,
            order: 1,
            icon: None,
        }],
        pages: vec![page],
    }
}

/// A live site holding "Current words", with release 9.0.0 archived while it
/// held "Archived words".
async fn site() -> Option<(Site, tokio::sync::MutexGuard<'static, ()>)> {
    let address = std::env::var("DOCS_TEST_NODE").ok()?;
    let alone = NODE.lock().await;
    let site = Site::new(&address, "t_ver_live", None);
    let mut store = site.writer().await.expect("a connection");
    store.migrate().await.expect("the schema applies");
    store
        .ingest(&corpus("Archived words."))
        .await
        .expect("ingest");
    store
        .archive("9.0.0", "t_ver_v9_0_0")
        .await
        .expect("archive");
    store
        .ingest(&corpus("Current words."))
        .await
        .expect("ingest");
    Some((site, alone))
}

async fn get(site: &Site, uri: &str) -> (StatusCode, String) {
    let request = Request::builder()
        .uri(uri)
        .body(Body::empty())
        .expect("a request");
    let response = docs_server::routes::router(site.clone())
        .oneshot(request)
        .await
        .expect("the router answers");
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), 1 << 20)
        .await
        .expect("a body");
    (status, String::from_utf8_lossy(&bytes).into_owned())
}

#[tokio::test]
async fn the_versions_route_lists_the_archived_releases_by_label_only() {
    let Some((site, _alone)) = site().await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    let (status, body) = get(&site, "/api/versions").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let listed: serde_json::Value = serde_json::from_str(&body).expect("json");
    assert_eq!(listed, serde_json::json!([{ "label": "9.0.0" }]));
    assert!(
        !body.contains("t_ver_v9_0_0"),
        "the namespace is not the address"
    );
}

#[tokio::test]
async fn an_archived_page_tree_and_search_answer_from_the_archive() {
    let Some((site, _alone)) = site().await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    let (status, body) = get(&site, "/api/v/9.0.0/page/guide/start").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains("Archived words."), "{body}");

    let (status, body) = get(&site, "/api/page/guide/start").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(
        body.contains("Current words."),
        "the live route moved: {body}"
    );

    let (status, body) = get(&site, "/api/v/9.0.0/nav").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains("guide/start"), "{body}");

    let (status, body) = get(&site, "/api/v/9.0.0/search?q=archived").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains("guide/start"), "{body}");
    let (status, body) = get(&site, "/api/v/9.0.0/search?q=current").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body, "[]", "the archive searched the live site");
    let (status, body) = get(&site, "/api/search?q=archived").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body, "[]", "the live site searched the archive");

    let (status, body) = get(&site, "/api/v/9.0.0/suggest?p=archi").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains("archived"), "{body}");
}

/// The site's own search box calls `/api/search` and `/api/suggest` with the
/// release as `?v=` — in production those paths reach this API directly, past
/// the front end, so the parameter has to mean the same here as the path does.
#[tokio::test]
async fn search_and_suggest_take_the_release_as_a_parameter_too() {
    let Some((site, _alone)) = site().await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    let (status, body) = get(&site, "/api/search?q=archived&v=9.0.0").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains("guide/start"), "{body}");
    let (status, body) = get(&site, "/api/search?q=current&v=9.0.0").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(
        body, "[]",
        "the parameter was ignored and the live site searched"
    );
    let (status, body) = get(&site, "/api/suggest?p=archi&v=9.0.0").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains("archived"), "{body}");
    let (status, _) = get(&site, "/api/search?q=archived&v=8.0.0").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let (status, body) = get(&site, "/api/search?q=current&v=").await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(
        body.contains("guide/start"),
        "an empty parameter is the live site: {body}"
    );
}

#[tokio::test]
async fn an_unknown_or_malformed_version_is_not_found() {
    let Some((site, _alone)) = site().await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    for uri in [
        "/api/v/8.0.0/page/guide/start",
        "/api/v/8.0.0/nav",
        "/api/v/8.0.0/search?q=words",
        "/api/v/x'%20OR%20true/nav",
    ] {
        let (status, body) = get(&site, uri).await;
        assert_eq!(status, StatusCode::NOT_FOUND, "{uri}: {body}");
    }
}

#[tokio::test]
async fn an_archive_cannot_be_written_through_the_api() {
    let Some((site, _alone)) = site().await else {
        eprintln!("skipped: DOCS_TEST_NODE is not set");
        return;
    };
    let request = Request::builder()
        .method("PUT")
        .uri("/api/v/9.0.0/page/guide/start")
        .body(Body::from("+++\ntitle = \"x\"\n+++\nx\n"))
        .expect("a request");
    let response = docs_server::routes::router(site.clone())
        .oneshot(request)
        .await
        .expect("the router answers");
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}
