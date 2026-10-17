"use client";

import { useRouter } from "next/navigation";

import { type ProjectId, home, projects } from "@/lib/projects";
import { Check, Chevron } from "./icons";
import { ProjectMark } from "./ProjectMark";
import { useListbox } from "./useListbox";

/**
 * Which product's documentation this is, and the way to the others.
 *
 * The header's first control: the product's mark and name, opening a list of
 * every product this site documents (see `useListbox` for the keyboard).
 * Choosing one goes to that product's front page — not to "the same page" as
 * the release picker does, because two products share no pages. Choosing the
 * current one goes to its front page too, which is what the mark did when it
 * was a plain link home.
 */
export function Projects({ shown }: { shown: ProjectId }) {
  const router = useRouter();
  const current = projects.findIndex((each) => each.id === shown);
  const box = useListbox(projects.length, current, (at) => {
    const chosen = projects[at];
    if (chosen !== undefined) router.push(home(chosen.id));
  });
  const here = projects[current] ?? projects[0];
  if (here === undefined) return null;

  return (
    <div
      className="projects"
      ref={box.box}
      data-open={box.open ? "yes" : undefined}
    >
      <button
        ref={box.button}
        type="button"
        className="projects-button brand"
        aria-haspopup="listbox"
        aria-expanded={box.open}
        aria-controls={box.listId}
        aria-label={`Product: ${here.name}. Switch product`}
        onClick={box.onButtonClick}
        onKeyDown={box.onButtonKey}
      >
        <ProjectMark id={here.id} />
        <span className="projects-current">{here.short}</span>
        <Chevron size={13} />
      </button>

      <ul
        ref={box.list}
        id={box.listId}
        role="listbox"
        tabIndex={-1}
        className="projects-list"
        data-instant={box.instant ? "yes" : undefined}
        aria-label="Product"
        aria-activedescendant={
          box.open ? `${box.listId}-${box.active}` : undefined
        }
        onKeyDown={box.onListKey}
      >
        {projects.map((each, at) => (
          <li
            key={each.id}
            id={`${box.listId}-${at}`}
            role="option"
            aria-selected={each.id === shown}
            data-active={at === box.active ? "yes" : undefined}
            className="projects-option"
            onPointerEnter={() => box.setActive(at)}
            onClick={() => box.pick(at)}
          >
            <ProjectMark id={each.id} size={26} />
            <span className="projects-text">
              <span className="projects-name">
                {each.name}
                <span className="projects-version">{each.latest}</span>
              </span>
              <span className="projects-blurb">{each.blurb}</span>
            </span>
            <span className="projects-check" aria-hidden="true">
              {each.id === shown ? <Check size={14} /> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
