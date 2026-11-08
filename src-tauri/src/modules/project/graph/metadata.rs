use super::super::contracts::{GraphEdge, GraphNode, NormalizedGraph, SourceDiagnostic};
use super::diagnostic;
use serde_json::{Map, Value};

pub fn resolve(
    pipeline_source: &str,
    metadata_source: &str,
    pipeline_file: &str,
) -> (NormalizedGraph, Vec<SourceDiagnostic>) {
    let pipeline = serde_json::from_str::<Value>(pipeline_source).unwrap_or(Value::Null);
    let metadata = serde_json::from_str::<Value>(metadata_source).unwrap_or(Value::Null);
    let instances = pipeline.get("instances").and_then(Value::as_object);
    let Some(instances) = instances else {
        return (empty_graph(), Vec::new());
    };
    let diagnostics = invalid_templates(instances, &metadata, pipeline_file);
    let nodes = instances
        .iter()
        .map(|(id, instance)| resolve_instance(id, &metadata, instance))
        .collect();
    let edges = instances.iter().flat_map(instance_edges).collect();
    (NormalizedGraph { nodes, edges }, diagnostics)
}

pub fn validate_layout(
    graph: &NormalizedGraph,
    source: Option<&str>,
    file: &str,
) -> Vec<SourceDiagnostic> {
    let Some(nodes) = layout_nodes(source) else {
        return Vec::new();
    };
    nodes
        .keys()
        .filter(|id| !graph.nodes.iter().any(|node| node.id == **id))
        .map(|id| {
            diagnostic(
                file,
                &format!("/nodes/{id}"),
                "Layout node is not in pipeline instances".into(),
            )
        })
        .collect()
}

fn resolve_instance(id: &str, metadata: &Value, instance: &Value) -> GraphNode {
    let key = instance.get("node").and_then(Value::as_str);
    let template = key.and_then(|name| metadata.pointer(&format!("/nodes/{name}")));
    let effective = merge(template, instance);
    let kind = effective
        .get("kind")
        .and_then(Value::as_str)
        .unwrap_or("Normal");
    let label = instance
        .get("label")
        .and_then(Value::as_str)
        .or(key)
        .unwrap_or(id);
    GraphNode {
        id: id.into(),
        label: label.into(),
        kind: kind.into(),
        metadata_key: key.map(str::to_owned),
        metadata_source: "Instance".into(),
        effective_config: effective,
        instance_config: Some(instance.clone()),
    }
}

fn instance_edges((id, instance): (&String, &Value)) -> Vec<GraphEdge> {
    let next = instance
        .get("next")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(|target| GraphEdge {
            from: id.clone(),
            to: target.into(),
            kind: "Next".into(),
        });
    let error = instance
        .get("error")
        .and_then(Value::as_str)
        .into_iter()
        .map(|target| GraphEdge {
            from: id.clone(),
            to: target.into(),
            kind: "Error".into(),
        });
    next.chain(error).collect()
}

fn merge(template: Option<&Value>, instance: &Value) -> Value {
    let mut merged = template
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if let Some(overrides) = instance.as_object() {
        for (key, value) in overrides {
            if !matches!(
                key.as_str(),
                "node" | "label" | "next" | "error" | "params" | "param_values"
            ) {
                merged.insert(key.clone(), value.clone());
            }
        }
    }
    Value::Object(merged)
}

fn invalid_templates(
    instances: &Map<String, Value>,
    metadata: &Value,
    file: &str,
) -> Vec<SourceDiagnostic> {
    instances
        .iter()
        .filter_map(|(id, instance)| {
            let template = instance.get("node").and_then(Value::as_str)?;
            metadata
                .pointer(&format!("/nodes/{template}"))
                .is_none()
                .then(|| {
                    diagnostic(
                        file,
                        &format!("/instances/{id}/node"),
                        format!("Instance '{id}' references missing template '{template}'"),
                    )
                })
        })
        .collect()
}

fn layout_nodes(source: Option<&str>) -> Option<Map<String, Value>> {
    source
        .and_then(|value| serde_json::from_str::<Value>(value).ok())
        .and_then(|value| value.get("nodes").cloned())
        .and_then(|value| value.as_object().cloned())
}

fn empty_graph() -> NormalizedGraph {
    NormalizedGraph {
        nodes: Vec::new(),
        edges: Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::resolve;

    #[test]
    fn resolves_instances_routes_and_overrides() {
        let pipeline = r#"{"instances":{"A":{"node":"Template","label":"Readable","timeout":9,"next":["B"]},"B":{"node":"Done"}}}"#;
        let metadata =
            r#"{"nodes":{"Template":{"kind":"Entry","timeout":5},"Done":{"kind":"Endpoint"}}}"#;
        let (graph, diagnostics) = resolve(pipeline, metadata, "demo.pipeline.json");
        assert!(diagnostics.is_empty());
        assert_eq!(graph.nodes[0].label, "Readable");
        assert_eq!(graph.nodes[1].label, "Done");
        assert_eq!(graph.nodes[0].effective_config["timeout"], 9);
        assert_eq!(graph.edges[0].to, "B");
    }
}
