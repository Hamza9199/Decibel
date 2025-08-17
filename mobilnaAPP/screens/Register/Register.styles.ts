import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  formContainer: {
    backgroundColor: 'rgba(35, 35, 35, 0.95)',
    borderRadius: 18,
    padding: 32,
    width: width - 40,
    maxWidth: 400,
    shadowColor: '#b91d95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  input: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#b91d95',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#e754a2',
    borderWidth: 2,
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
  button: {
    backgroundColor: '#b91d95',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
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
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#fff',
    fontSize: 15,
  },
  link: {
    color: '#e754a2',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
    textDecorationLine: 'underline',
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
