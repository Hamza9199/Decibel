import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: '#232323',
    padding: 18,
    paddingTop: 50, // Account for status bar
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImg: {
    height: 38,
    width: 38,
    marginRight: 14,
    borderRadius: 19,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginRight: 50,
  },
  searchContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  searchButton: {
    backgroundColor: '#181818',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPlaceholder: {
    color: '#888',
    marginLeft: 10,
    fontSize: 16,
  },
  mobileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  desktopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeMessage: {
    marginRight: 17,
    fontSize: 18,
    color: '#b91d95',
    fontWeight: '600',
  },
  profileImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 20,
  },
  profileImgMobile: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
  },
  logoutBtn: {
    backgroundColor: '#b91d95',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  logoutBtnMobile: {
    backgroundColor: '#b91d95',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
