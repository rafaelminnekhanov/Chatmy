import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Telegram Dark Colors - EXACT
const COLORS = {
  background: '#0E1621',
  surface: '#17212B',
  primary: '#64A9DC',
  text: '#FFFFFF',
  textSecondary: '#707579',
  border: '#0E1621',
  myMessage: '#2B5278',
  otherMessage: '#182533',
  inputBg: '#17212B',
};

export default function ChatScreen() {
  const router = useRouter();
  const { id: chatId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadChat();
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
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

  const loadChat = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chats`, {
        params: { user_id: user.id },
      });
      const currentChat = response.data.find(c => c.id === chatId);
      setChat(currentChat);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/chats/${chatId}/messages`,
        { params: { limit: 100 } }
      );
      // Reverse for inverted list
      setMessages([...response.data].reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/messages`,
        {
          chat_id: chatId,
          text: messageText,
        },
        {
          params: { sender_id: user.id },
        }
      );

      // Add to beginning of inverted list
      setMessages(prev => [response.data, ...prev]);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === user?.id;
    const showAvatar =
      !isMyMessage &&
      (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);

    const senderUser = chat?.participants?.find(p => p.id === item.sender_id);

    return (
      <View
        style={[
          styles.messageRow,
          isMyMessage ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isMyMessage && showAvatar && (
          <View style={styles.messageAvatar}>
            {senderUser?.avatar ? (
              <Image
                source={{ uri: senderUser.avatar }}
                style={styles.miniAvatar}
              />
            ) : (
              <View style={styles.miniAvatarPlaceholder}>
                <Text style={styles.miniAvatarText}>
                  {item.sender_name?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        {!isMyMessage && !showAvatar && <View style={styles.messageAvatarPlaceholder} />}

        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {!isMyMessage && chat?.is_group && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
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
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chat?.name || 'Чат'}
          </Text>
          {chat?.is_group && (
            <Text style={styles.headerSubtitle}>
              {chat.participants.length} участников
            </Text>
          )}
          {!chat?.is_group && chat?.participants && (
            <Text style={styles.headerSubtitle}>
              {chat.participants.find(p => p.id !== user?.id)?.online
                ? 'в сети'
                : 'не в сети'}
            </Text>
          )}
        </View>

        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        style={{ flex: 1 }}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Нет сообщений</Text>
          </View>
        }
      />

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          placeholder="Сообщение"
          placeholderTextColor={COLORS.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons
              name="send"
              size={22}
              color={inputText.trim() ? COLORS.primary : COLORS.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageAvatarPlaceholder: {
    width: 32,
    marginRight: 8,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  miniAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 12,
    padding: 10,
  },
  myMessageBubble: {
    backgroundColor: COLORS.myMessage,
    borderBottomRightRadius: 2,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.otherMessage,
    borderBottomLeftRadius: 2,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: COLORS.inputBg,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});
