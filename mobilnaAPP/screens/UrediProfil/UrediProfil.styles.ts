import { StyleSheet } from 'react-native';


export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    marginBottom: 50, // Adjusted to avoid overlap with bottom tab bar
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  content: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'rgba(35, 35, 35, 0.97)',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#b91d95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 8,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(185, 29, 149, 0.1)',
  },
  spacer: {
    width: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,

  },
  subtitle: {
    color: '#ffe6ec',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 24,
    textAlign: 'center',
  },
  form: {
    gap: 18,
  },
  label: {
    color: '#ffe6ec',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#b91d95',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 18,
  },
  inputFocused: {
    borderColor: '#e754a2',
    borderWidth: 2,
  },
  textArea: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#b91d95',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    maxHeight: 160,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#b91d95',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#b91d95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonPressed: {
    backgroundColor: '#e754a2',
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  profileImageSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  profileImageWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  imageButton: {
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#b91d95',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  imageButtonText: {
    color: '#ffe6ec',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#3a0d2e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffb3c6',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#1e3a2e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#baffc9',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
  
    backgroundColor: '#181818',
     height: '100%',
    width: '100%',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
});
