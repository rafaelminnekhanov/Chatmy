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
  StatusBar,
} from 'react-native';
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
};

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
      setTimeout(() => router.push(`/chat/${response.data.id}`), 100);
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
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
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
            <Ionicons name="checkmark" size={18} color={COLORS.text} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новая группа</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={createGroup}
            disabled={selectedUsers.length === 0 || !groupName.trim() || creating}
            activeOpacity={0.7}
          >
            {creating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                style={[
                  styles.createButtonText,
                  (selectedUsers.length === 0 || !groupName.trim()) &&
                    styles.createButtonTextDisabled,
                ]}
              >
                Создать
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.groupNameContainer}>
          <View style={styles.groupNameInput}>
            <Ionicons name="people-outline" size={24} color={COLORS.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Название группы"
              placeholderTextColor={COLORS.textSecondary}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
          </View>
        </View>

        {selectedUsers.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>
              Выбрано: {selectedUsers.length}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Участники</Text>

        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
        />
      </KeyboardAvoidingView>
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
    paddingTop: 50,
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
  createButton: {
    padding: 8,
  },
  createButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  createButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  groupNameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupNameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  selectedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});
