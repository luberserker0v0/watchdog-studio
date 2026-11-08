use super::super::contracts::{GraphEdge, NormalizedGraph, SourceDiagnostic};
use super::diagnostic;
use std::collections::{HashMap, HashSet};

pub fn validate(graph: &NormalizedGraph, file: &str) -> Vec<SourceDiagnostic> {
    let mut diagnostics = error_route_diagnostics(graph, file);
    diagnostics.extend(endpoint_diagnostics(graph, file));
    if has_cycle(graph) {
        diagnostics.push(diagnostic(
            file,
            "/edges",
            "Pipeline routing contains a cycle".into(),
        ));
    }
    diagnostics
}

fn error_route_diagnostics(graph: &NormalizedGraph, file: &str) -> Vec<SourceDiagnostic> {
    graph
        .nodes
        .iter()
        .filter_map(|node| {
            let count = outgoing(graph, &node.id)
                .filter(|edge| edge.kind == "Error")
                .count();
            (count > 1).then(|| {
                diagnostic(
                    file,
                    &format!("/nodes/{}/error", node.id),
                    format!(
                        "Node '{}' has {count} error edges; only one is supported",
                        node.id
                    ),
                )
            })
        })
        .collect()
}

fn endpoint_diagnostics(graph: &NormalizedGraph, file: &str) -> Vec<SourceDiagnostic> {
    graph
        .nodes
        .iter()
        .filter(|node| node.kind == "Endpoint" && outgoing(graph, &node.id).next().is_some())
        .map(|node| {
            diagnostic(
                file,
                &format!("/nodes/{}/routes", node.id),
                format!("Endpoint node '{}' must not have outgoing edges", node.id),
            )
        })
        .collect()
}

fn outgoing<'a>(graph: &'a NormalizedGraph, node: &'a str) -> impl Iterator<Item = &'a GraphEdge> {
    graph.edges.iter().filter(move |edge| edge.from == node)
}

fn has_cycle(graph: &NormalizedGraph) -> bool {
    let adjacency = adjacency(graph);
    let mut visited = HashSet::new();
    let mut active = HashSet::new();
    graph
        .nodes
        .iter()
        .any(|node| visit(&node.id, &adjacency, &mut visited, &mut active))
}

fn adjacency(graph: &NormalizedGraph) -> HashMap<&str, Vec<&str>> {
    let mut result: HashMap<&str, Vec<&str>> = HashMap::new();
    for edge in &graph.edges {
        result.entry(&edge.from).or_default().push(&edge.to);
    }
    result
}

fn visit<'a>(
    node: &'a str,
    adjacency: &HashMap<&'a str, Vec<&'a str>>,
    visited: &mut HashSet<&'a str>,
    active: &mut HashSet<&'a str>,
) -> bool {
    if active.contains(node) {
        return true;
    }
    if !visited.insert(node) {
        return false;
    }
    active.insert(node);
    let cyclic = adjacency.get(node).is_some_and(|next| {
        next.iter()
            .any(|child| visit(child, adjacency, visited, active))
    });
    active.remove(node);
    cyclic
}

#[cfg(test)]
mod tests {
    use super::validate;
    use crate::modules::project::contracts::{GraphEdge, GraphNode, NormalizedGraph};

    #[test]
    fn rejects_endpoint_routes_multiple_errors_and_cycles() {
        let graph = graph();
        let diagnostics = validate(&graph, "demo.md");

        assert!(
            diagnostics
                .iter()
                .any(|item| item.message.contains("Endpoint"))
        );
        assert!(
            diagnostics
                .iter()
                .any(|item| item.message.contains("2 error"))
        );
        assert!(
            diagnostics
                .iter()
                .any(|item| item.message.contains("cycle"))
        );
    }

    fn graph() -> NormalizedGraph {
        NormalizedGraph {
            nodes: vec![node("A", "Normal"), node("B", "Endpoint")],
            edges: vec![
                edge("A", "B", "Error"),
                edge("A", "B", "Error"),
                edge("B", "A", "Next"),
            ],
        }
    }

    fn node(id: &str, kind: &str) -> GraphNode {
        GraphNode {
            id: id.into(),
            label: id.into(),
            kind: kind.into(),
            metadata_key: None,
            metadata_source: "Instance".into(),
            effective_config: serde_json::json!({}),
            instance_config: None,
        }
    }

    fn edge(from: &str, to: &str, kind: &str) -> GraphEdge {
        GraphEdge {
            from: from.into(),
            to: to.into(),
            kind: kind.into(),
        }
    }
}
