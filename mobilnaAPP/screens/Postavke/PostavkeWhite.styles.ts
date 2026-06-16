import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  spacer: { flex: 1 },
  section: { marginBottom: 24 },
  label: { fontSize: 16, color: '#000', marginBottom: 8 },
  picker: { backgroundColor: '#f0f0f0' },
  pickerItem: { color: '#000' },
  linkSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkButton: { padding: 8 },
  linkText: { color: '#0066cc' },
  additionalText: { marginTop: 20, color: '#666' },
  modalOverlay: { flex:1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#000' },
  modalTitleDelete: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#d9534f' },
  modalText: { marginBottom: 12, color: '#333' },
  textArea: { height: 100, borderColor: '#ccc', borderWidth: 1, borderRadius: 4, padding: 8, marginBottom: 12, color: '#000' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, marginLeft: 8 },
  cancelButton: { backgroundColor: '#ccc' },
  sendButton: { backgroundColor: '#0066cc' },
  deleteButton: { backgroundColor: '#d9534f' },
  disabledButton: { opacity: 0.5 },
  modalButtonText: { color: '#fff' },
});
