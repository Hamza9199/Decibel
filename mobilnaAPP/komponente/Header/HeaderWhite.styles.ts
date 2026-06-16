import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#b91d95',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(185, 29, 149, 0.1)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginLeft: -8,
  },
  logoImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#181818',
    letterSpacing: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(185, 29, 149, 0.1)',
    marginRight: 5,
  },
  profileButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImgMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  searchContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  searchButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPlaceholder: {
    color: '#666',
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
