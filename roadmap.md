# Roadmap

- [ ] Replace the disconnected demo layout with a coherent, supported building.
- [ ] Improve live building materials, floor slabs, opening details, and lighting.

- [x] Add a structured, versioned architectural model with stable entity IDs.
- [x] Render floors, walls, doors, and windows from the model in the live Three.js view.
- [x] Replace mock inspector/tree data and quantity deltas with model-derived values.
- [x] Use GPT-6 Astra through the server-side Responses API for initial concepts, design proposals, and detailed Blender briefs.
- [x] Keep the API key server-side and persist project state locally.
- [x] Add a version-aware Blender worker contract, job polling, and GLB display path.
- [ ] Implement remaining architectural operations such as add/split/merge room, roof changes, and openings after concept creation.
- [ ] Connect and deploy the Blender worker described in [docs/BLENDER_WORKER.md](docs/BLENDER_WORKER.md).
- [ ] Add image/floor-plan upload and let Astra reconcile sketches with written dimensions.
- [ ] Add construction-view sheets, section/elevation views, and detailed material/quantity schedules.
- [ ] Add WebXR interactions against the same canonical model.
