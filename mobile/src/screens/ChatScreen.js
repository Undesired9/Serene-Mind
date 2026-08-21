import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { api } from '../services/api';

export default function ChatScreen() {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [sending, setSending] = useState(false);

    const flatListRef = useRef(null);

    const loadSessions = async () => {
        try {
            const data = await api.getSessions();
            setSessions(data);
            if (data && data.length > 0) {
                setCurrentSessionId(data[0].id);
                loadMessages(data[0].id);
            } else {
                handleCreateNewSession();
            }
        } catch (err) {
            console.error('Error fetching sessions', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    const loadMessages = async (sessionId) => {
        try {
            const data = await api.getMessages(sessionId);
            setMessages(data);
        } catch (err) {
            console.error('Error fetching messages', err);
        }
    };

    const handleCreateNewSession = async () => {
        try {
            const newSession = await api.createSession();
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            setMessages([]);
        } catch (err) {
            Alert.alert('Session Error', 'Could not create new chat session.');
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const handleSend = async () => {
        if (!inputMessage.trim() || sending || !currentSessionId) return;

        const userText = inputMessage.trim();
        setInputMessage('');

        // Optimistic user message addition
        const tempMsg = {
            id: Date.now(),
            sender: 'user',
            message: userText,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMsg]);
        setSending(true);

        try {
            const res = await api.sendMessage(currentSessionId, userText);
            if (res.botMessage) {
                setMessages(prev => [...prev, res.botMessage]);
            }
        } catch (err) {
            Alert.alert('Send Error', err.message || 'Failed to send message to AI companion.');
        } finally {
            setSending(false);
        }
    };

    if (loadingSessions) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0E7C7B" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {/* Session Header / Selector */}
                <View style={styles.sessionHeader}>
                    <FlatList
                        horizontal
                        data={sessions}
                        keyExtractor={item => item.id.toString()}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.sessionChip,
                                    currentSessionId === item.id && styles.sessionChipActive
                                ]}
                                onPress={() => {
                                    setCurrentSessionId(item.id);
                                    loadMessages(item.id);
                                }}
                            >
                                <Text style={[
                                    styles.sessionChipText,
                                    currentSessionId === item.id && styles.sessionChipTextActive
                                ]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListFooterComponent={
                            <TouchableOpacity style={styles.newSessionBtn} onPress={handleCreateNewSession}>
                                <Text style={styles.newSessionText}>+ New</Text>
                            </TouchableOpacity>
                        }
                    />
                </View>

                {/* Chat Messages List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    renderItem={({ item }) => {
                        const isUser = item.sender === 'user';
                        return (
                            <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
                                {!isUser && (
                                    <View style={styles.botAvatar}>
                                        <Text style={{ fontSize: 12 }}>🤖</Text>
                                    </View>
                                )}
                                <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleBot]}>
                                    <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>
                                        {item.message}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />

                {/* Chat Input Bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Type how you are feeling..."
                        placeholderTextColor="#A0AEC0"
                        value={inputMessage}
                        onChangeText={setInputMessage}
                        multiline
                    />
                    <TouchableOpacity 
                        style={[styles.sendBtn, (!inputMessage.trim() || sending) && styles.sendBtnDisabled]} 
                        onPress={handleSend}
                        disabled={!inputMessage.trim() || sending}
                    >
                        {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sendBtnText}>Send</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8E8E8'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8E8E8'
    },
    sessionHeader: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    sessionChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F0F4F8',
        marginRight: 8,
        maxWidth: 160
    },
    sessionChipActive: {
        backgroundColor: '#0E7C7B'
    },
    sessionChipText: {
        fontSize: 12,
        color: '#3D5A80',
        fontWeight: '500'
    },
    sessionChipTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold'
    },
    newSessionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#C2FFF0',
        alignItems: 'center',
        justifyContent: 'center'
    },
    newSessionText: {
        fontSize: 12,
        color: '#0E7C7B',
        fontWeight: 'bold'
    },
    messagesList: {
        padding: 16
    },
    msgRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end'
    },
    msgRowUser: {
        justifyContent: 'flex-end'
    },
    msgRowBot: {
        justifyContent: 'flex-start'
    },
    botAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#C2FFF0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8
    },
    msgBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18
    },
    msgBubbleUser: {
        backgroundColor: '#0E7C7B',
        borderBottomRightRadius: 4
    },
    msgBubbleBot: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1
    },
    msgText: {
        fontSize: 14,
        lineHeight: 20
    },
    msgTextUser: {
        color: '#FFFFFF'
    },
    msgTextBot: {
        color: '#0D1B2A'
    },
    inputBar: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        alignItems: 'center',
        gap: 8
    },
    textInput: {
        flex: 1,
        backgroundColor: '#F8FAF9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 14,
        color: '#0D1B2A'
    },
    sendBtn: {
        backgroundColor: '#0E7C7B',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 20
    },
    sendBtnDisabled: {
        backgroundColor: '#A0AEC0'
    },
    sendBtnText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14
    }
});
