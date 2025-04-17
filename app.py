from flask import Flask, render_template, request, jsonify
import json
import os
import random

app = Flask(__name__)

class MindBinderGame:
    def __init__(self):
        self.questions_asked = []
        self.load_knowledge_base()
        self.confidence_scores = {item: 1.0 for item in self.possible_items}
        self.current_properties = {}
        
    def load_knowledge_base(self):
        try:
            with open('knowledge_base.json', 'r') as f:
                data = json.load(f)
                self.possible_items = data.get('items', {})
                self.question_properties = data.get('questions', {})
        except FileNotFoundError:
            self.possible_items = {
                "cat": {
                    "living": True,
                    "holdable": True,
                    "daily_use": False,
                    "indoor": True,
                    "makes_sound": True,
                    "electronic": False,
                    "transportation": False,
                    "furniture": False
                }
            }
            self.question_properties = {
                "Is it a living thing?": "living",
                "Can you hold it in your hand?": "holdable",
                "Is it used daily?": "daily_use",
                "Is it found indoors?": "indoor",
                "Does it make sounds?": "makes_sound",
                "Is it electronic?": "electronic",
                "Is it used for transportation?": "transportation",
                "Is it a piece of furniture?": "furniture"
            }
            self.save_knowledge_base()
    
    def save_knowledge_base(self):
        with open('knowledge_base.json', 'w') as f:
            json.dump({
                'items': self.possible_items,
                'questions': self.question_properties
            }, f, indent=4)
    
    def generate_question(self):
        # Ask predefined questions in order
        for question, property_name in self.question_properties.items():
            if question not in self.questions_asked:
                self.questions_asked.append(question)
                return question
        return None
    
    def update_probabilities(self, question, answer):
        property_name = self.question_properties.get(question)
        if property_name:
            # Store the answer for learning new items
            self.current_properties[property_name] = (answer.lower() == "yes")
            
            # Update confidence scores
            for item, properties in self.possible_items.items():
                if (answer.lower() == "yes") == properties[property_name]:
                    self.confidence_scores[item] *= 2.0
                else:
                    self.confidence_scores[item] *= 0.3

    def make_guess(self):
        if not self.possible_items:
            return None
            
        sorted_items = sorted(self.confidence_scores.items(), key=lambda x: x[1], reverse=True)
        best_confidence = sorted_items[0][1]
        
        # More lenient confidence threshold
        if best_confidence < 0.3:
            return None
            
        if len(self.questions_asked) >= len(self.question_properties):
            self.reset_game()
            
        return sorted_items[0][0]
    
    def learn_new_item(self, item_name):
        # Add the new item with properties collected during questioning
        self.possible_items[item_name] = self.current_properties.copy()
        self.save_knowledge_base()
        self.reset_game()
    
    def reset_game(self):
        self.questions_asked = []
        self.confidence_scores = {item: 1.0 for item in self.possible_items}
        self.current_properties = {}

game = MindBinderGame()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/ask_question', methods=['POST'])
def ask_question():
    question = game.generate_question()
    if question:
        return jsonify({"question": question})
    else:
        guess = game.make_guess()
        if guess:
            return jsonify({"guess": guess})
        else:
            return jsonify({"unknown": True})

@app.route('/submit_answer', methods=['POST'])
def submit_answer():
    data = request.json
    question = data.get('question')
    answer = data.get('answer')
    game.update_probabilities(question, answer)
    return jsonify({"status": "success"})

@app.route('/learn_item', methods=['POST'])
def learn_item():
    data = request.json
    new_item = data.get('item_name')
    if new_item:
        game.learn_new_item(new_item.lower())
        return jsonify({"status": "success", "message": f"Learned about {new_item}"})
    return jsonify({"status": "error", "message": "No item name provided"})

if __name__ == '__main__':
    app.run(debug=True)