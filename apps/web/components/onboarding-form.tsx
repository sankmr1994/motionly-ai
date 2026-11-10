"use client";

import { useMemo } from "react";
import { completeOnboarding } from "../app/onboarding/actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  return (
    <form className="onboarding-form" action={completeOnboarding}>
      <input type="hidden" name="timezone" value={timezone} />
      <label>
        Your name
        <input name="name" defaultValue={defaultName} minLength={2} required />
      </label>
      <label>
        What will you create most often?
        <select name="contentCategory" required defaultValue="">
          <option value="" disabled>
            Choose a category
          </option>
          <option value="education">Education</option>
          <option value="technology">Technology</option>
          <option value="business">Business</option>
          <option value="finance">Finance</option>
          <option value="science">Science</option>
          <option value="wellness">Wellness</option>
          <option value="other">Something else</option>
        </select>
      </label>
      <label>
        Preferred video language
        <select name="language" defaultValue="English">
          <option>English</option>
          <option>Hindi</option>
          <option>Tamil</option>
          <option>Telugu</option>
          <option>Kannada</option>
          <option>Malayalam</option>
        </select>
      </label>
      <label>
        Your main publishing goal
        <select name="publishingGoal" required defaultValue="">
          <option value="" disabled>
            Choose a goal
          </option>
          <option value="grow-audience">Grow an audience</option>
          <option value="teach-clearly">Teach ideas clearly</option>
          <option value="build-brand">Build my brand</option>
          <option value="publish-consistently">Publish consistently</option>
          <option value="experiment">Explore video creation</option>
        </select>
      </label>
      <p className="timezone-note">
        Scheduling time zone: <strong>{timezone}</strong>
      </p>
      <button className="button button-primary auth-submit">
        Continue to dashboard
      </button>
    </form>
  );
}
