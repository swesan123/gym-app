import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'program_entry_screen.dart';

class ProgramEntriesScreen extends StatelessWidget {
  final String userId;
  final String programId;

  ProgramEntriesScreen({required this.userId, required this.programId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('$programId Program'),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('users')
            .doc(userId)
            .collection('programs')
            .doc(programId)
            .collection('entries')
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error loading entries'));
          }
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          }
          if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
            return Center(child: Text('No entries found'));
          }

          final entries = snapshot.data!.docs;

          // Sort entries in the desired order: Push, Pull, Legs
          entries.sort((a, b) {
            const order = ['Push', 'Pull', 'Legs'];
            return order.indexOf(a.id).compareTo(order.indexOf(b.id));
          });

          return ListView.builder(
            itemCount: entries.length,
            itemBuilder: (context, index) {
              var entry = entries[index];
              return ListTile(
                title: Text(entry.id),
                trailing: IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () {
                    _deleteEntry(entry.id);
                  },
                ),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ProgramEntryScreen(
                        userId: userId,
                        programId: programId,
                        entryId: entry.id,
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

  Future<void> _deleteEntry(String entryId) async {
    await FirebaseFirestore.instance
        .collection('users')
        .doc(userId)
        .collection('programs')
        .doc(programId)
        .collection('entries')
        .doc(entryId)
        .delete();
  }
}
