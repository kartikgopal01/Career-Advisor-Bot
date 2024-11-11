from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import jwt
from functools import wraps
from datetime import datetime, timedelta, timezone
import logging
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import google.generativeai as genai
import pandas as pd
from fuzzywuzzy import fuzz  # Add this for fuzzy string matchingi

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = 'AIzaSyCWJ-9Cux77MKM4viOypRwD5-p60Med_pQ'
MONGO_URI = 'mongodb://localhost:27017/'
DB_NAME = 'career_advisor_db'
GEMINI_API_KEY = "AIzaSyCWJ-9Cux77MKM4viOypRwD5-p60Med_pQ"
CAREER_DATA_PATH = 'career_data.csv'

# MongoDB setup
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db['users']
chat_history_collection = db['chat_history']

# Logging setup
logging.basicConfig(filename='app.log', level=logging.INFO)
logger = logging.getLogger(__name__)

# Gemini AI model configuration
genai.configure(api_key=GEMINI_API_KEY)
GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 1,
    "top_k": 40,
    "max_output_tokens": 2048,
}
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

conversation_history = []
def load_career_data():
    try:
        return pd.read_csv(CAREER_DATA_PATH)
    except Exception as e:
        logger.error(f"Error loading career data: {str(e)}")
        return pd.DataFrame()
def search_career_in_csv(query):
    career_data = load_career_data()
    if career_data.empty:
        return None
    
    # Convert query to lowercase for better matching
    query = query.lower()
    
    # First try exact match
    for idx, row in career_data.iterrows():
        if row['career_name'].lower() == query:
            return row['details']
    
    # If no exact match, try fuzzy matching
    best_match_score = 0
    best_match_details = None
    
    for idx, row in career_data.iterrows():
        score = fuzz.ratio(query, row['career_name'].lower())
        if score > 80 and score > best_match_score:  # 80% similarity threshold
            best_match_score = score
            best_match_details = row['details']
    
    return best_match_details

def initialize_model():
    try:
        logger.info("Initializing the Gemini model")
        return genai.GenerativeModel(
            model_name="gemini-pro",
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS
        )
    except Exception as e:
        logger.error(f"Error initializing Gemini model: {str(e)}")
        return None

def get_gemini_response(user_input):
    logger.info("Processing user input")
    
    # First, check if the input is asking about a career
    career_related_keywords = ['career', 'job', 'profession', 'work', 'engineer', 'engineering']
    
    # Check if the input contains career-related keywords
    is_career_query = any(keyword in user_input.lower() for keyword in career_related_keywords)
    
    if is_career_query:
        # Try to find career information in CSV
        career_info = search_career_in_csv(user_input)
        
        if career_info:
            logger.info("Career information found in CSV")
            return career_info
    
    # If no career information found in CSV or not a career query, use Gemini
    logger.info("Using Gemini for response")
    model = initialize_model()
    if model is None:
        return "I apologize, but there was an issue initializing the AI model. Please try again later."

    prompt_parts = [
        "You are an AI assistant specializing in engineering careers and skills. Your role is to provide comprehensive and accurate information about various engineering fields, career paths, required skills, job prospects, and skill development. Focus on delivering concise, relevant, and up-to-date responses tailored to the user's specific query. Include information about both technical and soft skills relevant to engineering careers. If a query is outside the scope of engineering careers or skills, politely redirect the conversation back to these topics. For salary expectations, provide ranges based on recent industry data, specifying the country (default to India unless otherwise specified). Suggest resources for skill development when appropriate.",
        f"User: {user_input}",
        "Assistant: "
    ]

    # Add conversation history to the prompt
    for entry in conversation_history[-5:]:
        prompt_parts.insert(-2, f"User: {entry['user']}")
        prompt_parts.insert(-2, f"Assistant: {entry['assistant']}")

    try:
        response = model.generate_content(prompt_parts)
        logger.info("Received response from Gemini")
        return response.text
    except Exception as e:
        logger.error(f"Error generating Gemini response: {str(e)}")
        return "I apologize, but there was an issue generating the response. Please try again."


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('token')
        if not token:
            return redirect(url_for('login'))
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = users_collection.find_one({"username": data['username']})
            if not current_user:
                return redirect(url_for('login'))
        except:
            return redirect(url_for('login'))
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/')
@token_required
def index(current_user):
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = users_collection.find_one({"username": username})
    if user and check_password_hash(user['password'], password):
        token = jwt.encode({
            'username': username,
            'exp': datetime.now(timezone.utc) + timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        response = jsonify({"message": "Login successful", "token": token})
        response.set_cookie('token', token, httponly=True, secure=True, samesite='Lax')
        return response, 200
    
    return jsonify({"error": "Invalid username or password"}), 401

@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if users_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 400
    
    hashed_password = generate_password_hash(password)
    users_collection.insert_one({
        "username": username, 
        "password": hashed_password,
        "created_at": datetime.now()
    })
    
    return jsonify({"message": "User created successfully"}), 201

@app.route('/logout')
def logout():
    response = redirect(url_for('login'))
    response.delete_cookie('token')
    return response

@app.route('/chat', methods=['POST'])
@token_required
def chat(current_user):
    logger.info("POST request received at /chat")
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
       
        if not user_message:
            logger.warning("No message provided in the request")
            return jsonify({"error": "No message provided"}), 400
       
        logger.info(f"Received message: {user_message}")
       
        # Get response from Gemini
        assistant_response = get_gemini_response(user_message)
       
        logger.info(f"Gemini response: {assistant_response}")
       
        # Update conversation history
        conversation_history.append({
            "user": user_message,
            "assistant": assistant_response
        })
       
        # Store chat in MongoDB
        chat_history_collection.insert_one({
            "user_id": current_user['_id'],
            "user_message": user_message,
            "assistant_response": assistant_response,
            "timestamp": datetime.now()
        })
       
        return jsonify({"response": assistant_response})
    except Exception as e:
        logger.error(f"Error in chat route: {str(e)}")
        return jsonify({"error": "An internal server error occurred", "details": str(e)}), 500
# Add these routes to app.py after the existing routes

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    try:
        # Get user's chat history
        user_chats = chat_history_collection.find(
            {"user_id": current_user['_id']},
            {"user_message": 1, "assistant_response": 1, "timestamp": 1}
        ).sort("timestamp", -1).limit(10)  # Get last 10 chats
        
        # Get unique careers explored from chat history
        careers_explored = chat_history_collection.distinct(
            "career_mentioned",
            {"user_id": current_user['_id']}
        )
        
        profile_data = {
            "username": current_user['username'],
            "chat_history": list(user_chats),
            "careers_explored": careers_explored if careers_explored else [],
            "total_chats": chat_history_collection.count_documents({"user_id": current_user['_id']}),
            "join_date": current_user.get('created_at', datetime.now()).strftime("%Y-%m-%d")
        }
        
        return jsonify(profile_data), 200
    except Exception as e:
        logger.error(f"Error fetching profile data: {str(e)}")
        return jsonify({"error": "Failed to fetch profile data"}), 500



@app.route('/reset', methods=['POST'])
def reset_conversation():
    logger.info("POST request received at /reset")
    try:
        global conversation_history
        conversation_history = []
        logger.info("Conversation history reset successfully")
        return jsonify({"message": "Conversation history has been reset successfully."})
    except Exception as e:
        logger.error(f"Error resetting conversation history: {str(e)}")
        return jsonify({"error": "An internal server error occurred", "details": str(e)}), 500

@app.route('/ai-engineer')
def ai_engineer():
    return render_template('ai-engineer.html')

if __name__ == '__main__':
    app.run(debug=True)