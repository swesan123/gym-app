#!/bin/bash
# GitHub CLI script to create issues for the Gym Tracker App
REPO="swesan123/gym-app"

# MVP Feature Issues
gh issue create --repo "$REPO" --title "Create workout data model" --body "Define a Workout class with fields like id, date, and exercises. Include toMap/fromMap for Firestore." --label "type: feature,backend"
gh issue create --repo "$REPO" --title "Create exercise and set data models" --body "Define ExerciseEntry and SetEntry models for each logged exercise and set." --label "type: feature,backend"
gh issue create --repo "$REPO" --title "Build workout logging screen" --body "UI to add exercises and sets. Basic layout with input fields for name, reps, and weight." --label "type: feature,web,ui"
gh issue create --repo "$REPO" --title "Add dynamic set input (reps/weight)" --body "Enable users to add/remove multiple sets for each exercise dynamically." --label "type: enhancement,ui"
gh issue create --repo "$REPO" --title "Add rest timer widget" --body "Add a countdown timer between sets with optional vibration or alert." --label "type: enhancement,ui"
gh issue create --repo "$REPO" --title "Save workout to Firestore" --body "Send logged workout data to Firestore when workout is completed." --label "type: feature,firebase,backend"
gh issue create --repo "$REPO" --title "Create workout history screen" --body "Display a list or calendar of past workouts with summary data." --label "type: feature,web,ui"
gh issue create --repo "$REPO" --title "Add Firebase Authentication" --body "Enable login and registration using Firebase Auth (email/password)." --label "type: feature,firebase"
gh issue create --repo "$REPO" --title "Display progress chart with fl_chart" --body "Use fl_chart to visualize total volume or sets over time." --label "type: feature,ui,web"
gh issue create --repo "$REPO" --title "Load user workouts from Firestore" --body "Load workouts by current user from Firestore and display in history view." --label "type: feature,firebase,backend"

# Refactoring & Modularity
gh issue create --repo "$REPO" --title "Create reusable exercise tile widget" --body "Extract a widget to display exercises and sets cleanly." --label "type: refactor,ui"
gh issue create --repo "$REPO" --title "Create workout card widget for history" --body "Reusable component for showing past workout summaries." --label "type: refactor,ui"
gh issue create --repo "$REPO" --title "Move constants (colors, Firestore keys)" --body "Centralize constants to improve maintainability." --label "type: chore,backend"
gh issue create --repo "$REPO" --title "Split state logic into providers" --body "Move UI logic and state into dedicated Provider classes." --label "type: refactor,backend"

# UI / UX Enhancements
gh issue create --repo "$REPO" --title "Add responsive layout scaling" --body "Ensure layouts work well on mobile and desktop using LayoutBuilder or MediaQuery." --label "type: enhancement,ui,web"
gh issue create --repo "$REPO" --title "Add empty state views for history/progress" --body "Add default illustrations or tips when no data is present." --label "type: enhancement,ui"
gh issue create --repo "$REPO" --title "Add light/dark mode toggle (optional)" --body "Support for theme switching and proper color contrast." --label "type: enhancement,ui"

# Testing & Validation
gh issue create --repo "$REPO" --title "Add unit tests for models (to/fromMap)" --body "Test serialization of Workout, ExerciseEntry, and SetEntry." --label "type: test,backend"
gh issue create --repo "$REPO" --title "Add integration test for workout logging" --body "Ensure users can log workouts from UI to Firestore in tests." --label "type: test,web"

# Deployment & Cleanup
gh issue create --repo "$REPO" --title "Set up Firebase Hosting for web app" --body "Deploy the web app using Firebase CLI to hosting." --label "type: chore,firebase"
gh issue create --repo "$REPO" --title "Optimize performance for build" --body "Audit Flutter build and optimize UI rebuilds, lazy load where needed." --label "type: enhancement,web"
gh issue create --repo "$REPO" --title "Create README badges + feature list" --body "Add shields (build, firebase, version) and highlight main features." --label "type: documentation"
gh issue create --repo "$REPO" --title "Finalize and export SRS to GitHub docs" --body "Move the finalized Software Requirements Specification to the docs folder and link it from README." --label "type: documentation"
