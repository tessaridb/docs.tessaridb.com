//! Which product a page documents.
//!
//! The site documents the engine and the products built around it. Each product
//! other than the engine owns exactly one top-level section, named by its slug —
//! `s3`, `am`, `kv` — and every page under it is that product's. Everything else
//! is the engine's, which is why the engine has no root of its own: its pages
//! were here first and keep the URLs they always had.
//!
//! # Why the set is closed here
//!
//! A project is the unit a release is kept by and a search is narrowed to, so a
//! name that arrives in a request is checked against this list and nothing else.
//! The front end carries the same list, with logos and product sites beside it;
//! the two are kept equal by the front end's own check.

use crate::read::Node;

/// A product documented on this site.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Project {
    /// TessariDB itself. Every page outside the other products' sections.
    Engine,
    /// TessariDB S3, under `/s3`.
    S3,
    /// TessariDB Agent Memory, under `/am`.
    AgentMemory,
    /// TessariKV, under `/kv`.
    Kv,
}

impl Project {
    /// Every project, the engine first.
    pub const ALL: [Self; 4] = [Self::Engine, Self::S3, Self::AgentMemory, Self::Kv];

    /// The name a request and a version record carry: `db`, `s3`, `am`, `kv`.
    #[must_use]
    pub const fn slug(self) -> &'static str {
        match self {
            Self::Engine => "db",
            Self::S3 => "s3",
            Self::AgentMemory => "am",
            Self::Kv => "kv",
        }
    }

    /// The project a name means, or `None` for a name that is not one.
    ///
    /// An absent or empty name is the engine, so every route that has always
    /// answered without one keeps answering the same way.
    #[must_use]
    pub fn named(name: &str) -> Option<Self> {
        if name.is_empty() {
            return Some(Self::Engine);
        }
        Self::ALL.into_iter().find(|project| project.slug() == name)
    }

    /// The top-level section this project's pages live under, or `None` for the
    /// engine, whose pages live everywhere else.
    #[must_use]
    pub const fn root(self) -> Option<&'static str> {
        match self {
            Self::Engine => None,
            other => Some(other.slug()),
        }
    }

    /// The project a page or section belongs to, by the first step of its slug.
    #[must_use]
    pub fn of(slug: &str) -> Self {
        let first = slug.split('/').next().unwrap_or_default();
        Self::ALL
            .into_iter()
            .find(|project| project.root() == Some(first))
            .unwrap_or(Self::Engine)
    }

    /// Whether a page or section belongs to this project.
    #[must_use]
    pub fn holds(self, slug: &str) -> bool {
        Self::of(slug) == self
    }

    /// The left-hand tree as this project shows it.
    ///
    /// The engine shows every root that is not another product's; a product
    /// shows what its own root holds, so its tree starts one level down rather
    /// than repeating its own name as the only heading.
    #[must_use]
    pub fn narrow(self, tree: Vec<Node>) -> Vec<Node> {
        match self.root() {
            None => tree
                .into_iter()
                .filter(|node| self.holds(&node.slug))
                .collect(),
            Some(root) => tree
                .into_iter()
                .find(|node| node.slug == root)
                .map(|node| node.children)
                .unwrap_or_default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Project;
    use crate::read::Node;

    fn section(slug: &str, children: Vec<Node>) -> Node {
        Node {
            slug: slug.to_owned(),
            title: slug.to_owned(),
            kind: "section",
            icon: None,
            children,
        }
    }

    fn page(slug: &str) -> Node {
        Node {
            slug: slug.to_owned(),
            title: slug.to_owned(),
            kind: "page",
            icon: None,
            children: Vec::new(),
        }
    }

    #[test]
    fn a_name_is_one_of_four_and_nothing_else_is_a_project() {
        assert_eq!(Project::named("s3"), Some(Project::S3));
        assert_eq!(Project::named("am"), Some(Project::AgentMemory));
        assert_eq!(Project::named("kv"), Some(Project::Kv));
        assert_eq!(Project::named("db"), Some(Project::Engine));
        assert_eq!(
            Project::named(""),
            Some(Project::Engine),
            "absent is the engine"
        );
        assert_eq!(Project::named("tessarikv"), None);
        assert_eq!(Project::named("S3"), None, "names are exact");
        assert_eq!(Project::named("s3' OR true"), None);
    }

    #[test]
    fn a_page_belongs_to_the_product_whose_section_holds_it() {
        assert_eq!(Project::of("s3/what-it-is"), Project::S3);
        assert_eq!(Project::of("am/index"), Project::AgentMemory);
        assert_eq!(Project::of("kv"), Project::Kv);
        assert_eq!(Project::of("query-language/records"), Project::Engine);
        assert_eq!(Project::of("index"), Project::Engine);
        // A prefix of a name is not the name: `s3x` is the engine's section.
        assert_eq!(Project::of("s3x/page"), Project::Engine);
        assert!(Project::Kv.holds("kv/the-engine"));
        assert!(!Project::Kv.holds("query-language/records"));
    }

    #[test]
    fn the_engine_tree_leaves_the_products_out_and_a_product_tree_starts_inside_its_root() {
        let tree = vec![
            section("start", vec![page("start/install")]),
            section("s3", vec![section("s3/run", vec![page("s3/run/serve")])]),
            section("kv", vec![page("kv/what-it-is")]),
        ];
        let engine: Vec<String> = Project::Engine
            .narrow(tree.clone())
            .into_iter()
            .map(|node| node.slug)
            .collect();
        assert_eq!(engine, ["start"]);

        let s3: Vec<String> = Project::S3
            .narrow(tree.clone())
            .into_iter()
            .map(|node| node.slug)
            .collect();
        assert_eq!(s3, ["s3/run"]);

        assert!(
            Project::AgentMemory.narrow(tree).is_empty(),
            "a product with no section yet shows nothing rather than the engine's tree"
        );
    }
}
