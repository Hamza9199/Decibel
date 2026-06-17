import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginBottom: 50, 
  },
  scrollContainer: {
    padding: 16,
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
    backgroundColor: '#b91d95',
    borderRadius: 4,
  },
});
