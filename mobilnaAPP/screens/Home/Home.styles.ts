import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f10',
    paddingBottom: 20,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#0f0f10',
  },
  content: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
    fontWeight: '400',
  },

  /* Hero / Spotlight Banner */
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 28,
    backgroundColor: '#1a1a1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  heroBadgeWrap: {
    marginBottom: 12,
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  heroInfo: {
    flex: 1,
    marginLeft: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: '#a0a0a5',
    marginBottom: 12,
  },
  heroPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  heroPlayText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },

  /* Quick Picks Section */
  quickSection: {
    marginBottom: 28,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  quickCard: {
    width: '47%',
    marginHorizontal: '1.5%',
    marginBottom: 10,
    backgroundColor: '#18181c',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickImage: {
    width: 48,
    height: 48,
  },
  quickTextWrap: {
    flex: 1,
    paddingHorizontal: 10,
  },
  quickTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  quickSub: {
    color: '#8e8e93',
    fontSize: 11,
    marginTop: 2,
  },

  /* Section Styles */
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  horizontalList: {
    paddingHorizontal: 20,
  },

  /* Card Styles */
  card: {
    backgroundColor: '#18181c',
    borderRadius: 14,
    marginRight: 14,
    width: 145,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  activeCard: {
    backgroundColor: '#222226',
    borderColor: '#ffffff',
    borderWidth: 1.5,
  },
  artistCard: {
    alignItems: 'center',
  },
  cardImageWrap: {
    position: 'relative',
    width: '100%',
    height: 125,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardImageWrap2: {
    position: 'relative',
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  cardDesc: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '400',
  },
  artistTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
});