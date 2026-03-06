import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = {
  background: '#0E1621',
  surface: '#1C2733',
  primary: '#2A9FD6',
  text: '#FFFFFF',
  textSecondary: '#8E9AA6',
  border: '#2E3A47',
  online: '#4CD964',
};

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'groups'
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    filterData();
  }, [searchQuery, users, chats]);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      router.replace('/');
    }
  };

  const loadData = async () => {
    try {
      const [usersResponse, chatsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/users`),
        axios.get(`${API_URL}/api/chats`, { params: { user_id: user.id } }),
      ]);

      const otherUsers = usersResponse.data.filter(u => u.id !== user.id);
      setUsers(otherUsers);
      
      const groupChats = chatsResponse.data.filter(c => c.is_group);
      setChats(groupChats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      setFilteredUsers(users);
      setFilteredChats(chats);
      return;
    }

    const filteredU = users.filter(
      u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
    setFilteredUsers(filteredU);

    const filteredC = chats.filter(c =>
      c.name?.toLowerCase().includes(query)
    );
    setFilteredChats(filteredC);
  };

  const startChat = async (otherUser) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/chats`,
        {
          participant_id: otherUser.id,
          is_group: false,
        },
        {
          params: { current_user_id: user.id },
        }
      );

      router.replace('/chats');
      setTimeout(() => router.push(`/chat/${response.data.id}`), 100);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const openGroupChat = (chat) => {
    router.replace('/chats');
    setTimeout(() => router.push(`/chat/${chat.id}`), 100);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => startChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {item.online && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemEmail}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => openGroupChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemEmail}>
          {item.participants?.length || 0} участников
        </Text>
      </View>

      <Ionicons name="people" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const currentData = activeTab === 'users' ? filteredUsers : filteredChats;
  const renderItem = activeTab === 'users' ? renderUserItem : renderGroupItem;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Поиск</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'users' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'users' && styles.tabTextActive,
            ]}
          >
            Контакты
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'groups' && styles.tabActive,
          ]}
          onPress={() => setActiveTab('groups')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'groups' && styles.tabTextActive,
            ]}
          >
            Группы
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'users' ? 'people-outline' : 'people-circle-outline'}
              size={80}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Ничего не найдено'
                : activeTab === 'users'
                ? 'Нет контактов'
                : 'Нет групп'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
  },
  tabText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});
