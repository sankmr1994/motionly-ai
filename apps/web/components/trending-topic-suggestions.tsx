"use client";

import { useActionState } from "react";
import {
  loadTrendingTopics,
  type TrendingTopicsActionState,
} from "../app/dashboard/create/trending-actions";

const initialState: TrendingTopicsActionState = {};

export function TrendingTopicSuggestions({
  onSelect,
}: {
  onSelect: (idea: string) => void;
}) {
  const [state, action, pending] = useActionState(
    loadTrendingTopics,
    initialState,
  );
  const loaded = Boolean(state.suggestions?.length);
  return (
    <section className="trending-ideas" aria-labelledby="trending-ideas-title">
      <div className="trending-ideas-heading">
        <div>
          <span>AI TOPIC DISCOVERY</span>
          <h3 id="trending-ideas-title">Not sure what to create today?</h3>
          <p>Get current ideas matched to your saved content preferences.</p>
        </div>
        <button
          type="submit"
          formAction={action}
          formNoValidate
          disabled={pending}
        >
          {pending
            ? "Finding ideas…"
            : loaded
              ? "Refresh ideas"
              : "Suggest topics"}
        </button>
      </div>
      <input type="hidden" name="refreshTopics" value={loaded ? "1" : "0"} />

      {state.message ? (
        <p className="trending-ideas-message" role="status">
          {state.message}
        </p>
      ) : null}

      {state.suggestions ? (
        <div className="trending-ideas-grid">
          {state.suggestions.map((suggestion) => (
            <article key={`${suggestion.title}:${suggestion.idea}`}>
              <span>{suggestion.category}</span>
              <h4>{suggestion.title}</h4>
              <p>{suggestion.whyNow}</p>
              <button type="button" onClick={() => onSelect(suggestion.idea)}>
                Use this idea →
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {state.sources?.length ? (
        <details className="trending-sources">
          <summary>
            Why these are current · {state.sources.length} web sources
          </summary>
          <div>
            {state.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
              </a>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
