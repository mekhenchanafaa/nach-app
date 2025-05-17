import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Toaster, toast } from "sonner";

type User = {
  _id: Id<"users">;
  name: string;
  isOnline?: boolean;
  blockedUsers?: Id<"users">[];
};

type Message = {
  _id: Id<"messages">;
  content: string;
  senderId: Id<"users">;
  receiverId: Id<"users">;
  _creationTime: number;
};

type FriendRequest = {
  _id: Id<"friendships">;
  userId1: Id<"users">;
  userId2: Id<"users">;
  status: string;
  actionUserId: Id<"users">;
  requester: User;
};

export default function App() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [isLogin, setIsLogin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createUser = useMutation(api.users.createUser);
  const login = useQuery(api.users.login, 
    isLogin && name && password ? { name, password } : "skip"
  );
  const deleteAccount = useMutation(api.users.deleteAccount);
  const blockUser = useMutation(api.users.blockUser);
  const unblockUser = useMutation(api.users.unblockUser);
  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const acceptFriendRequest = useMutation(api.friends.acceptFriendRequest);
  const refuseFriendRequest = useMutation(api.friends.refuseFriendRequest);
  const sendMessage = useMutation(api.messages.sendMessage);

  const currentUser = useQuery(api.users.getUser, 
    userId ? { userId } : "skip"
  );
  const searchResults = useQuery(api.users.searchUsers, 
    userId && searchTerm ? { searchTerm, currentUserId: userId } : "skip"
  ) ?? [];
  const friendRequests = useQuery(api.friends.getFriendRequests, 
    userId ? { userId } : "skip"
  ) as FriendRequest[] | undefined;
  const friends = useQuery(api.friends.getFriends, 
    userId ? { userId } : "skip"
  ) as User[] | undefined;
  const messages = useQuery(api.messages.getMessages,
    userId && selectedFriend ? { 
      user1Id: userId, 
      user2Id: selectedFriend._id 
    } : "skip"
  );

  const isBlocked = Boolean(selectedFriend && currentUser?.blockedUsers?.includes(selectedFriend._id));
  const isBlockedBy = Boolean(selectedFriend?.blockedUsers?.includes(userId!));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };

    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (login && login._id && !userId) {
      setUserId(login._id);
      setIsLogin(false);
      setName("");
      setPassword("");
      toast.success(`Welcome back, ${login.name}!`);
    } else if (isLogin && login === null) {
      toast.error("Invalid credentials. Please try again.");
      setIsLogin(false);
    }
  }, [login, userId, isLogin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Toaster />
        <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-4xl font-bold mb-2 text-white text-center">
            Nach
          </h1>
          <h2 className="text-xl font-medium mb-6 text-gray-400 text-center">
            {isLogin ? "Welcome Back" : "Join the conversation"}
          </h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (name.trim() && password) {
              if (isLogin) {
                setIsLogin(true);
              } else {
                try {
                  const id = await createUser({ 
                    name: name.trim(), 
                    password 
                  });
                  setUserId(id);
                  toast.success("Account created successfully!");
                  setName("");
                  setPassword("");
                } catch (error: any) {
                  toast.error(error.data?.message || "Name already taken");
                }
              }
            } else {
              toast.error("Please enter both name and password");
            }
          }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border rounded mb-4 bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your name"
              required
              minLength={2}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded mb-6 bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Password"
              required
              minLength={4}
            />
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition-colors duration-150 mb-3 text-lg font-semibold"
            >
              {isLogin ? "Log In" : "Sign Up"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setName("");
                setPassword("");
              }}
              className="w-full bg-gray-600 text-white p-3 rounded hover:bg-gray-500 transition-colors duration-150 text-lg"
            >
              {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col md:flex-row overflow-hidden">
      <Toaster position="top-center" />
      
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-md hover:bg-gray-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div 
        className={`
          fixed inset-y-0 left-0 z-40 transform ${showSidebar ? "translate-x-0" : "-translate-x-full"} 
          md:relative md:translate-x-0 md:w-80 
          w-full sm:w-72 bg-gray-800 p-4 flex flex-col transition-transform duration-300 ease-in-out
          shadow-lg md:shadow-none
        `}
      >
        {/* ... Rest of the sidebar content remains the same ... */}
      </div>

      <div className="flex-1 flex flex-col bg-gray-850 overflow-hidden">
        {!selectedFriend ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 text-lg">Select a friend to start chatting</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-800 p-3 md:p-4 flex items-center shadow-md">
              <div className="w-10 h-1 md:hidden"></div>
              <div className="flex-grow text-center">
                <h2 className="text-lg md:text-xl font-semibold truncate px-2">
                  {selectedFriend.name}
                </h2>
              </div>
              <div className="w-auto">
                <button
                  onClick={async () => {
                    if (isBlocked) {
                      await unblockUser({
                        userId: userId!,
                        userToUnblockId: selectedFriend._id,
                      });
                      toast.success(`${selectedFriend.name} unblocked`);
                    } else {
                      await blockUser({
                        userId: userId!,
                        userToBlockId: selectedFriend._id,
                      });
                      toast.error(`${selectedFriend.name} blocked`);
                    }
                  }}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-medium transition-colors ${
                    isBlocked
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {isBlocked ? "Unblock" : "Block"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
              {messages?.map((message, index) => {
                const isOwnMessage = message.senderId === userId;
                const isFirstInGroup = index === 0 || 
                  messages[index - 1].senderId !== message.senderId;
                const isLastInGroup = index === messages.length - 1 || 
                  messages[index + 1].senderId !== message.senderId;

                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                        relative max-w-[80%] md:max-w-lg group
                        ${isOwnMessage ? "items-end" : "items-start"}
                      `}
                    >
                      <div
                        className={`
                          px-3 py-2 
                          ${isOwnMessage ? "bg-blue-600" : "bg-gray-700"}
                          ${isFirstInGroup && isLastInGroup ? "rounded-2xl" : ""}
                          ${isFirstInGroup && !isLastInGroup ? 
                            isOwnMessage ? 
                              "rounded-t-2xl rounded-l-2xl rounded-br-lg" : 
                              "rounded-t-2xl rounded-r-2xl rounded-bl-lg"
                            : ""
                          }
                          ${!isFirstInGroup && isLastInGroup ?
                            isOwnMessage ?
                              "rounded-b-2xl rounded-l-2xl rounded-tr-lg" :
                              "rounded-b-2xl rounded-r-2xl rounded-tl-lg"
                            : ""
                          }
                          ${!isFirstInGroup && !isLastInGroup ?
                            isOwnMessage ?
                              "rounded-l-2xl rounded-tr-lg rounded-br-lg" :
                              "rounded-r-2xl rounded-tl-lg rounded-bl-lg"
                            : ""
                          }
                          shadow-sm
                        `}
                      >
                        <p className="text-sm md:text-base text-white break-words">
                          {message.content}
                        </p>
                        <span className="text-[10px] text-white/60 block text-right mt-1 select-none">
                          {new Date(message._creationTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {(!isBlocked && !isBlockedBy) && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (messageText.trim()) {
                    try {
                      await sendMessage({
                        content: messageText.trim(),
                        senderId: userId!,
                        receiverId: selectedFriend._id,
                      });
                      setMessageText("");
                    } catch (error: any) {
                      toast.error(error.data?.message || "Failed to send message");
                    }
                  }
                }}
                className="p-3 md:p-4 bg-gray-800 border-t border-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2.5 md:p-3 rounded-lg bg-gray-700 border border-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="bg-blue-500 p-2.5 md:p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    aria-label="Send message"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className="w-5 h-5 md:w-6 md:h-6 text-white"
                    >
                      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
            {(isBlocked || isBlockedBy) && (
              <div className="p-3 md:p-4 bg-gray-800 border-t border-gray-700 text-center">
                <p className="text-sm text-yellow-400">
                  {isBlocked && `You have blocked ${selectedFriend.name}. Unblock to send messages.`}
                  {isBlockedBy && `${selectedFriend.name} may have blocked you.`}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
