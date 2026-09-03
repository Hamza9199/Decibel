import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginBottom: 50, 
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  headerRow: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
    marginTop: 15,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  label: {
    color: '#666',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-start',
  },
  acceptBtn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#81c784',
    borderRadius: 4,
  },
  rejectBtn: {
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#e57373',
    borderRadius: 4,
  },
  playBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#181818',
    borderRadius: 4,
  },
  songItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    color: '#666',
    fontSize: 14,
  },
  songActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#181818',
    borderRadius: 20,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptAction: {
    backgroundColor: '#81c784',
  },
  rejectAction: {
    backgroundColor: '#e57373',
  },
});