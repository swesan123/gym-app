import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:intl/intl.dart';
import 'workout_entry_screen.dart';
import 'dart:developer' as developer;

class EntriesScreen extends StatefulWidget {
  @override
  _EntriesScreenState createState() => _EntriesScreenState();
}

class _EntriesScreenState extends State<EntriesScreen> {
  final TextEditingController searchController = TextEditingController();
  String searchQuery = '';

  @override
  Widget build(BuildContext context) {
    User? user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Text('Entries'),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(48.0),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: TextField(
              controller: searchController,
              decoration: InputDecoration(
                hintText: 'Search Entries',
                border: InputBorder.none,
                hintStyle: TextStyle(color: Colors.grey),
              ),
              style: TextStyle(color: Colors.white, fontSize: 20),
              onChanged: (value) {
                setState(() {
                  searchQuery = value.trim();
                });
              },
            ),
          ),
        ),
        actions: [
          Padding(
            padding:
                const EdgeInsets.only(right: 32.0), // Shift the button left
            child: IconButton(
              icon: Icon(Icons.add, color: Colors.white),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => WorkoutEntryScreen()),
                );
              },
            ),
          ),
        ],
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('users')
            .doc(user?.uid)
            .collection('entries')
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            developer.log("Firestore Error: ${snapshot.error}", level: 1000);
            return Center(child: Text('Error loading entries'));
          }
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(child: Text('No entries found'));
          }

          final entries = snapshot.data!.docs.where((doc) {
            final data = doc.data() as Map<String, dynamic>;
            final entryName = data['entryName'];
            return entryName != null && entryName.contains(searchQuery);
          }).toList();

          // Sort entries by latest time
          entries.sort((a, b) {
            var dateA =
                DateTime.parse((a.data() as Map<String, dynamic>)['date']);
            var dateB =
                DateTime.parse((b.data() as Map<String, dynamic>)['date']);
            return dateB.compareTo(dateA);
          });

          return ListView.builder(
            itemCount: entries.length,
            itemBuilder: (context, index) {
              var data = entries[index].data() as Map<String, dynamic>;
              var date = DateTime.parse(data['date']);
              var formattedDate = DateFormat('MMMM d, yyyy').format(date);
              var formattedTime = DateFormat('hh:mm a').format(date);
              return ListTile(
                title: Text(data['entryName']),
                subtitle: Text('$formattedDate at $formattedTime'),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => WorkoutEntryScreen(
                        entryId: entries[index].id,
                        entryName: data['entryName'],
                      ),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
