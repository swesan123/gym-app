# Personal Gym Tracker App

A cross-platform gym workout tracking app built with **Flutter** and **Firebase**, designed for personal use. This app helps you log workouts, monitor progress, and stay consistent with your fitness goals. It starts as a web app and will be ported to iOS and Android.

## Features

- **Custom Workout Routines** – Create your own exercises and workout plans.
- **Workout Logging** – Track sets, reps, and weights with an intuitive interface.
- **Rest Timer** – In-built countdown timer between sets.
- **Workout History** – View past workouts in a list or calendar format.
- **Progress Graphs** – Visualize improvement over time with charts.
- **Firebase Integration** – Sync data securely across devices.

## Tech Stack

- **Frontend:** Flutter (Web, iOS, Android)
- **Backend:** Firebase
  - Authentication
  - Firestore Database
  - Firebase Hosting

## Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/gym-tracker-app.git
   cd gym-tracker-app
   ```

2. **Install Dependencies:**
   ```bash
   flutter pub get
   ```

3. **Set Up Firebase:**
   - Create a Firebase project.
   - Add web, iOS, and Android apps to the project.
   - Download and place the config files:
     - `firebase_options.dart` (via FlutterFire CLI)
     - `google-services.json` for Android
     - `GoogleService-Info.plist` for iOS

4. **Run the App (Web):**
   ```bash
   flutter run -d chrome
   ```

## Folder Structure

```
lib/
├── main.dart
├── models/
├── services/
├── providers/
├── screens/
└── widgets/
```

## Deployment (Web)

1. Build the app:
   ```bash
   flutter build web
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## Future Improvements

- Add support for supersets/circuits
- Bodyweight & measurement tracking
- Export to CSV or PDF
- Social sharing (private logs, progress pics)

## License

This project is for **personal use** only and is not intended for commercial distribution.
