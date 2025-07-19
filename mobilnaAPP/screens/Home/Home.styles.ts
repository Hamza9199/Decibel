import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
        marginBottom: 50,

  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#181818',
  },
  content: {
    flex: 1,
    paddingTop: 20, // Add some padding after the header
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    paddingTop: 20, // Reduced since custom header is now at top
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  horizontalList: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#232323',
    borderRadius: 10,
    marginRight: 15,
    width: 150,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeCard: {
    backgroundColor: '#2a2a2a',
    borderColor: '#b91d95',
    borderWidth: 2,
  },
  cardImageWrap: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  cardImageWrap2: {
    position: 'relative',
    width: '100%',
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#b91d95',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    paddingHorizontal: 10,
    paddingTop: 10,
    textDecorationLine: 'none',
  },
  cardDesc: {
    color: '#b3b3b3',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
    textDecorationLine: 'none',
    paddingBottom: 5,
  },
});
