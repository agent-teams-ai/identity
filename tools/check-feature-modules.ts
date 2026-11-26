import assert from "node:assert/strict";
import { checkFeatureModule, STANDARD } from "@agent-teams/feature-module-standard";
import { conformanceCases } from "@agent-teams/feature-module-standard/fixtures";
import { checkFeatureModuleOnDisk, formatNodeReport } from "@agent-teams/feature-module-standard/node";
import type { LayerRole } from "@agent-teams/feature-module-standard/node";
import { observeSourceGraph } from "@agent-teams/engineering-foundation/source-graph";
import { checkModuleLayout } from "@get-modular/conformance";
import type { LayoutImport } from "@get-modular/conformance";
import profile from "../architecture/foundation/feature-modules.json" with { type: "json" };

assert.equal(profile.standard.id, STANDARD.id);
assert.equal(profile.standard.version, STANDARD.version);
assert.equal(profile.standard.digest, STANDARD.digest);
for (const fixture of conformanceCases) {
  const report = checkFeatureModule(fixture.input);
  assert.equal(report.ok, fixture.ok, fixture.id);
  assert.deepEqual(report.diagnostics.map((item) => item.code).toSorted(), fixture.expect, fixture.id);
}

function layerRole(role: string): LayerRole {
  switch (role) {
    case "domain":
    case "application":
    case "contracts":
    case "adapters":
    case "composition":
    case "testing":
      return role;
    default:
      throw new Error("Unknown FMS layer role: " + role);
  }
}

for (const module of profile.modules) {
  const graph = await observeSourceGraph({
    consumerRoot: process.cwd(),
    roots: [module.sourceRoot, ...module.testRoots],
  });
  assert.deepEqual(graph.parseFailures, [], module.id);
  assert.deepEqual(graph.unresolved, [], module.id);
  assert.deepEqual(graph.unresolvedRuntimeReferences, [], module.id);
  const moduleComposition = graph.files.filter((file) =>
    module.moduleAssembly.some((root) => file === root || file.startsWith(root + "/")),
  );
  const report = await checkFeatureModuleOnDisk({
    consumerRoot: process.cwd(),
    sourceRoots: [module.sourceRoot],
    testRoots: module.testRoots,
    structure: {
      featureRoots: module.features.map((feature) => feature.root),
      roleRoots: module.features.flatMap((feature) =>
        feature.layers.map((layer) => ({ root: layer.root, role: layerRole(layer.role) })),
      ),
      featuresRoots: [module.sourceRoot + "/features"],
    },
    testFeaturesRoot: module.testFeaturesRoot,
    surfaces: module.surfaces,
    moduleComposition,
    useEdges: [],
  });
  assert.ok(report.ok, formatNodeReport(report));
  const files = graph.files.filter((file) => file.startsWith(module.sourceRoot + "/"));
  const exports = graph.runtimeExports.filter((file) => file.path.includes("/application/use-cases/"));
  for (const file of exports) assert.equal(file.status, "complete", file.path);
  const imports: LayoutImport[] = graph.edges
    .filter((edge) => files.includes(edge.from))
    .map((edge) => ({ from: edge.from, to: edge.to, mode: edge.mode === "runtime" ? "value" : "type" }));
  const layout = checkModuleLayout({
    files,
    imports,
    useCaseExports: Object.fromEntries(exports.map((file) => [file.path, file.exports])),
  });
  assert.deepEqual(layout.violations, [], module.id);
  console.log(module.id + ": FMS and CMS passed on " + files.length + " source files.");
}
