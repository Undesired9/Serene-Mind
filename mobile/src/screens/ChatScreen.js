import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { api } from '../services/api';

const QUICK_PROMPTS = [
    "I feel anxious today",
    "I can't sleep well",
    "Help me reframe negative thoughts",
    "I need daily motivation"
];

export default function ChatScreen() {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [sending, setSending] = useState(false);
    const [isListening, setIsListening] = useState(false);

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

    const handleSend = async (customText = null) => {
        const textToSend = customText || inputMessage.trim();
        if (!textToSend || sending || !currentSessionId) return;

        if (!customText) setInputMessage('');

        const tempMsg = {
            id: Date.now(),
            sender: 'user',
            message: textToSend,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMsg]);
        setSending(true);

        try {
            const res = await api.sendMessage(currentSessionId, textToSend);
            const botText = res.reply || res.message || (res.botMessage && (res.botMessage.content || res.botMessage.message));
            if (botText) {
                const botMsg = {
                    id: Date.now() + 1,
                    sender: 'ai',
                    content: botText,
                    message: botText,
                    risk_level: res.riskLevel,
                    timestamp: new Date().toISOString()
                };
                setMessages(prev => [...prev, botMsg]);
            }
            if (res.isCrisis || res.riskTier === 'CRITICAL') {
                Alert.alert(
                    '🇵🇰 Clinical Safety Support',
                    'Your safety is our highest priority. Please contact the Umang Mental Health Helpline (0311-7786264), Rescue 1122, or reach out to a doctor immediately.',
                    [
                        { text: 'Close', style: 'cancel' }
                    ]
                );
            }
        } catch (err) {
            Alert.alert('Send Error', err.message || 'Failed to send message to AI companion.');
        } finally {
            setSending(false);
        }
    };

    const handleUnlockChat = async () => {
        try {
            await api.unlockChat();
            Alert.alert('Chat Resumed', 'You may continue your therapeutic conversation.');
        } catch (e) {
            console.warn('Unlock chat error', e);
        }
    };

    const handleDeleteSession = async (sessionId) => {
        Alert.alert(
            'Delete Session',
            'Are you sure you want to delete this conversation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.deleteSession(sessionId);
                            loadSessions();
                        } catch (err) {
                            Alert.alert('Error', 'Could not delete session.');
                        }
                    }
                }
            ]
        );
    };

    const handleMicToggle = () => {
        if (!isListening) {
            setIsListening(true);
            // Simulate voice dictation
            setTimeout(() => {
                setInputMessage("I am feeling a bit stressed about work today.");
                setIsListening(false);
            }, 2500);
        } else {
            setIsListening(false);
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

                {/* Quick Prompts Bar */}
                <View style={styles.promptsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {QUICK_PROMPTS.map((prompt, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={styles.promptChip}
                                onPress={() => handleSend(prompt)}
                            >
                                <Text style={styles.promptChipText}>💡 {prompt}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
                        const msgBody = item.content || item.message || '';
                        return (
                            <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
                                {!isUser && (
                                    <View style={styles.botAvatar}>
                                        <Text style={{ fontSize: 12 }}>🤖</Text>
                                    </View>
                                )}
                                <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleBot]}>
                                    <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextBot]}>
                                        {msgBody}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />

                {/* Voice Dictation Active Indicator */}
                {isListening && (
                    <View style={styles.listeningBanner}>
                        <ActivityIndicator color="#0E7C7B" size="small" />
                        <Text style={styles.listeningText}>Listening... Speak clearly into your microphone.</Text>
                    </View>
                )}

                {/* Chat Input Bar */}
                <View style={styles.inputBar}>
                    <TouchableOpacity 
                        style={[styles.micBtn, isListening && styles.micBtnActive]} 
                        onPress={handleMicToggle}
                    >
                        <Text style={{ fontSize: 18 }}>🎙️</Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.textInput}
                        placeholder="Type or tap mic to speak..."
                        placeholderTextColor="#A0AEC0"
                        value={inputMessage}
                        onChangeText={setInputMessage}
                        multiline
                    />
                    <TouchableOpacity 
                        style={[styles.sendBtn, (!inputMessage.trim() || sending) && styles.sendBtnDisabled]} 
                        onPress={() => handleSend()}
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
    promptsContainer: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#E8E8E8'
    },
    promptChip: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#C2FFF0'
    },
    promptChipText: {
        fontSize: 12,
        color: '#0E7C7B',
        fontWeight: '600'
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
    listeningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#C2FFF0',
        padding: 10,
        justifyContent: 'center'
    },
    listeningText: {
        fontSize: 12,
        color: '#0E7C7B',
        fontWeight: 'bold'
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
    micBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F4F8',
        alignItems: 'center',
        justifyContent: 'center'
    },
    micBtnActive: {
        backgroundColor: '#C2FFF0',
        borderWidth: 2,
        borderColor: '#0E7C7B'
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
        backgroundColor: '#1B98E0',
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
