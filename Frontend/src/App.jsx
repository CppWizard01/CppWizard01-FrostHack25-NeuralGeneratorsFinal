import { useState, useEffect, useRef } from "react";
import "./App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faClockRotateLeft, faGear, faPaperPlane, faTrash } from "@fortawesome/free-solid-svg-icons";
import menuIcon from "./assets/sideIcon.png";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys

function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [selectedType, setSelectedType] = useState("text");
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [username, setUsername] = useState("");
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [chatSessions, setChatSessions] = useState([[]]);
    const [activeSessionIndex, setActiveSessionIndex] = useState(0);
    const [sessionNames, setSessionNames] = useState(["New Chat"]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const extractedUsername = currentUser.email.split("@")[0];
                setUsername(extractedUsername);
            } else {
                setUsername("");
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages]);

    useEffect(() => {
        console.log("Active Session Index: ", activeSessionIndex);
        console.log("Chat Sessions: ", chatSessions);
        setMessages(chatSessions[activeSessionIndex] || []);
    }, [activeSessionIndex, chatSessions]);

    useEffect(() => {
        const loadChatSessions = async () => {
            if (user) {
                try {
                    const response = await fetch(https://frosthack25-neuralgenerators.onrender.com/loadChat/${user.uid});
                    const data = await response.json();

                    if (data.chatSessions) {
                        setChatSessions(data.chatSessions);
                        setSessionNames(data.sessionNames);
                        setActiveSessionIndex(0);
                    }
                } catch (error) {
                    console.error("Error loading chat sessions:", error);
                }
            }
        };
        loadChatSessions();
    }, [user]);

    const saveChatSessions = async () => {
        if (user) {
            try {
                await fetch("https://frosthack25-neuralgenerators.onrender.com/saveChat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user.uid, chatSessions, sessionNames }),
                });
            } catch (error) {
                console.error("Error saving chat sessions:", error);
            }
        }
    };

    useEffect(() => {
        saveChatSessions();
    }, [chatSessions, sessionNames]);

    const handleRegister = async () => {
        setErrorMessage("");
        if (user) {
            setErrorMessage("* You are already logged in. Please log out first.");
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Registration Error:", error.message);
            if (error.code === "auth/email-already-in-use") {
                setErrorMessage("* This email is already registered. Try logging in.");
            } else {
                setErrorMessage("* An unexpected error occurred. Please try again.");
            }
        }
    };

    const handleLogin = async () => {
        setErrorMessage("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Login Error:", error.message);
            if (error.code === "auth/user-not-found") {
                setErrorMessage("* You have to register.");
            } else if (error.code === "auth/wrong-password") {
                setErrorMessage("* Incorrect password.");
            } else if (error.code === "auth/invalid-credential") {
                setErrorMessage("* Invalid email or password.");
            } else {
                setErrorMessage("* An unexpected error occurred. Please try again.");
            }
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout Error:", error.message);
        }
    };

    const handleInput = (event) => {
        setMessage(event.target.value);
    };

    const handleSendMessage = async () => {
        if (message.trim()) {
            setLoading(true);
            try {
                let requestBody = {};
                let url = https://frosthack25-neuralgenerators.onrender.com/generate?type=${selectedType};

                if (selectedType === "music" || selectedType === "video") { // Include video
                    requestBody = { prompt: message };
                } else if (selectedType === "image" || selectedType === "text") {
                    url += &prompt=${encodeURIComponent(message)};
                }

                const response = await fetch(url, {
                    method: selectedType === "music" || selectedType === "video" ? "POST" : "GET", // Include video
                    headers: { "Content-Type": "application/json" },
                    body: selectedType === "music" || selectedType === "video" ? JSON.stringify(requestBody) : null, // Include video
                });

                const data = await response.json();
                let newMessages = [{ text: message, isUser: true, id: uuidv4() }]; // Add unique id

                if (selectedType === "music" && data.audio_url) {
                    const proxyUrl = https://frosthack25-neuralgenerators.onrender.com/proxy-audio?url=${encodeURIComponent(data.audio_url)};
                    newMessages.push({ text: <audio controls><source src="${proxyUrl}" type="audio/mpeg">Your browser does not support the audio tag.</audio>, isUser: false, id: uuidv4() }); // Add unique id
                } else if (selectedType === "image" && data.image_url) {
                    newMessages.push({ imageUrl: data.image_url, isUser: false, id: uuidv4() }); // Add unique id
                } else if (selectedType === "text" && data.text) {
                    newMessages.push({ text: data.text, isUser: false, id: uuidv4() }); // Add unique id
                }else if (selectedType === "video" && data.video_url) { // Add video handling
                    newMessages.push({ videoUrl: data.video_url, isUser: false, id: uuidv4() });
                } else {
                    newMessages.push({ text: data.message || "No response received.", isUser: false, id: uuidv4() }); // Add unique id
                }

                setChatSessions((prev) => {
                    const newSessions = [...prev];
                    newSessions[activeSessionIndex] = [...newSessions[activeSessionIndex], ...newMessages];
                    return newSessions;
                });

                if (chatSessions[activeSessionIndex].length === 0) {
                    const words = message.trim().split(" ");
                    const sessionName = words.slice(0, 3).join(" ");
                    const newSessionNames = [...sessionNames];
                    newSessionNames[activeSessionIndex] = sessionName;
                    setSessionNames(newSessionNames);
                }

                setMessage("");
                setLoading(false);
            } catch (error) {
                console.error("Error fetching data from backend:", error);
                setErrorMessage("Failed to fetch response. Please try again.");
                setLoading(false);
            }
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const handleNewChat = () => {
        setActiveSessionIndex((prev) => prev + 1);
        setChatSessions((prev) => [...prev, []]);
        setSessionNames((prev) => [...prev, "New Chat"]);
        setMessage("");
    };

    const handleSessionClick = (index) => {
        console.log("Session clicked:", index);
        setActiveSessionIndex(index);
        setMessage("");
    };

    const handleDeleteSession = (index) => {
        setChatSessions((prev) => prev.filter((_, i) => i !== index));
        setSessionNames((prev) => prev.filter((_, i) => i !== index));

        if (activeSessionIndex === index) {
            setActiveSessionIndex(0); // Go to the first session after deletion
        } else if (activeSessionIndex > index) {
            setActiveSessionIndex((prev) => prev - 1); // Adjust active index if a session before it was deleted
        }
        // If the deleted session is after the active one, no change to activeIndex is needed.
    };

    return (
        <div className="app-container">
            <div className={sidebar ${isSidebarOpen ? "open" : "closed"}}>
                {isSidebarOpen && (
                    <div className="sidebar-content">
                        {user ? (
                            <>
                                <p className="welcome-user">Welcome, <strong>{username}</strong></p>
                                <button className="logout-btn" onClick={handleLogout}>Logout</button>
                            </>
                        ) : (
                            <button className="login-btn" onClick={() => setIsModalOpen(true)}> Login/Register</button>
                        )}
                        <ul>
                            <li className="newbtn" onClick={handleNewChat}>
                                <FontAwesomeIcon icon={faPlus} className="sidebar-icon " /> Start a New Chat
                            </li>
                            <li className="history-item">
                                <FontAwesomeIcon icon={faClockRotateLeft} /> Your Previous Chat History
                            </li>
                            {chatSessions.map((_, index) => (
                                chatSessions[index] && chatSessions[index].length > 0 && <li key={index} className={index === activeSessionIndex ? "active-chat" : ""} onClick={() => handleSessionClick(index)}>{sessionNames[index]} <FontAwesomeIcon icon={faTrash} className="delete-session" onClick={() => handleDeleteSession(index)} /></li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className={main-content ${isSidebarOpen ? "with-sidebar" : "full-width"}}>
                <div className="top-bar">
                    <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <img src={menuIcon} alt="Menu" className="menu-icon" />
                    </button>
                    <select className="type-dropdown" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="music">Music</option>
                        <option value="video">Video</option>
                    </select>
                </div>

                {messages.length === 0 && <h1 className="gradient-text">Hello {user ? username : "Guest"}</h1>}

                <div className="messages-container">
                    {messages.map((message, index) => {
                        return (
                            <div key={message.id} className={message-box ${message.isUser ? "user-message" : "generated-message"}}>
                                {message.imageUrl ? (
                                    <div>
                                        <img src={message.imageUrl} alt="Generated Image" style={{ maxWidth: "100%", borderRadius: "10px" }} />
                                        <div style={{ marginTop: '10px' }}>
                                            <button className="download-image-button" onClick={(e) => {
                                                e.preventDefault();
                                                const link = document.createElement("a");
                                                link.href = message.imageUrl;
                                                link.download = "generated-image.jpg";
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}>
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                ) : message.videoUrl ? (
                                  <video controls style={{ maxWidth: "100%", borderRadius: "10px" }}>
                                    <source src={message.videoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                    <div className="message-content" dangerouslySetInnerHTML={{ __html: message.text || "" }} />
                                )}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-container">
                    <textarea
                        className="text-input"
                        placeholder="Ask anything"
                        value={message}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        rows="3"
                        disabled={loading}
                    />
                    <button className="send-btn" onClick={handleSendMessage} disabled={loading || !message.trim()}>
                        <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <button className="close-btn" onClick={() => setIsModalOpen(false)}>✖</button>
                        <h2>Login / Register</h2>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                        <div className="button-group">
                            <button className="login-btn" onClick={handleLogin}>Login</button>
                            <button className="register-btn" onClick={handleRegister}>Register</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;