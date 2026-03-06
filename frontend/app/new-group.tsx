import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function NewGroupScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadUsers();
    }
  }, [user]);

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

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      const otherUsers = response.data.filter(u => u.id !== user.id);
      setUsers(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Ошибка', 'Введите название группы');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одного участника');
      return;
    }

    setCreating(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/chats/group`,
        {
          name: groupName.trim(),
          participant_ids: selectedUsers,
        },
        {
          params: { current_user_id: user.id },
        }
      );

      router.replace('/chats');
      router.push(`/chat/${response.data.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Ошибка', 'Не удалось создать группу');
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = ({ item }) => {
    const isSelected = selectedUsers.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => toggleUserSelection(item.id)}
      >
        <BlurView intensity={20} style={styles.userBlur}>
          <View style={styles.userContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>

            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1a1a', '#2d2d2d']}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d']}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новая группа</Text>
          <TouchableOpacity
            style={[
              styles.createButton,
              (selectedUsers.length === 0 || !groupName.trim() || creating) &&
                styles.createButtonDisabled,
            ]}
            onPress={createGroup}
            disabled={selectedUsers.length === 0 || !groupName.trim() || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Создать</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.groupNameContainer}>
          <BlurView intensity={20} style={styles.groupNameBlur}>
            <View style={styles.groupNameInput}>
              <Ionicons name="people" size={24} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Название группы"
                placeholderTextColor="#999"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
              />
            </View>
          </BlurView>
        </View>

        {selectedUsers.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>
              Выбрано: {selectedUsers.length}
            </Text>
            <FlatList
              horizontal
              data={selectedUsers}
              keyExtractor={(item) => item}
              renderItem={({ item: userId }) => {
                const selectedUser = users.find(u => u.id === userId);
                if (!selectedUser) return null;

                return (
                  <View style={styles.selectedUserChip}>
                    <Text style={styles.selectedUserName} numberOfLines={1}>
                      {selectedUser.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleUserSelection(userId)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>
                );
              }}
              contentContainerStyle={styles.selectedList}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        <Text style={styles.sectionTitle}>Выберите участников</Text>

        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  groupNameContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  groupNameBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupNameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(60, 60, 60, 0.6)',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  selectedContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  selectedList: {
    gap: 8,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
    maxWidth: 120,
  },
  selectedUserName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(60, 60, 60, 0.6)',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
});
