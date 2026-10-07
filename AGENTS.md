<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep live architectural detailing derived from the canonical room and wall geometry; separate appearance from editable design data so visuals track changes.
- Build the demo from shared boundary walls and aligned storeys; migrate only the exact legacy demo, never overwrite a user's generated project.
- Validate new concepts for room connectivity and supported, vertically aligned storeys; reject impossible massing rather than silently presenting it as a valid house.
- Mount the 3D workspace client-only and render on demand; browser state must hydrate before interaction and idle scenes need not consume continuous GPU frames.
