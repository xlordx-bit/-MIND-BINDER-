document.addEventListener('DOMContentLoaded', () => {
    const thoughtBubble = document.getElementById('thought-bubble');
    const questionArea = document.getElementById('question-area');
    const currentQuestion = document.getElementById('current-question');
    const resultArea = document.getElementById('result-area');
    const learningArea = document.getElementById('learning-area');
    const finalGuess = document.getElementById('final-guess');
    const yesBtn = document.getElementById('yes-btn');
    const noBtn = document.getElementById('no-btn');
    const playAgainBtn = document.getElementById('play-again');
    const teachBtn = document.getElementById('teach-btn');
    const skipLearningBtn = document.getElementById('skip-learning');
    const newItemInput = document.getElementById('new-item-input');
    const progressFill = document.querySelector('.progress-fill');
    const currentQuestionNum = document.getElementById('current-question-num');
    const totalQuestions = document.getElementById('total-questions');

    let questionCount = 0;
    const maxQuestions = 8; // Match with the total in HTML

    function updateProgress() {
        const progress = (questionCount / maxQuestions) * 100;
        progressFill.style.width = `${progress}%`;
        currentQuestionNum.textContent = questionCount + 1;
    }

    function showElement(element, animate = true) {
        element.classList.remove('hidden');
        if (animate) {
            void element.offsetWidth; // Trigger reflow
            element.classList.add('visible');
        }
    }

    function hideElement(element) {
        element.classList.remove('visible');
        element.classList.add('hidden');
    }

    // Show initial thought bubble with animation
    showElement(thoughtBubble);
    setTimeout(() => {
        hideElement(thoughtBubble);
        askQuestion();
    }, 3000);

    async function askQuestion() {
        try {
            const response = await fetch('/ask_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.question) {
                currentQuestion.textContent = data.question;
                questionCount++;
                updateProgress();
                showElement(questionArea);
                hideElement(resultArea);
                hideElement(learningArea);
                
                // Animate question appearance
                currentQuestion.style.animation = 'none';
                void currentQuestion.offsetWidth;
                currentQuestion.style.animation = 'fadeIn 0.5s ease';
            } else if (data.guess) {
                showGuess(data.guess);
            } else if (data.unknown) {
                showLearningArea();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function submitAnswer(answer) {
        try {
            const question = currentQuestion.textContent;
            yesBtn.disabled = true;
            noBtn.disabled = true;

            await fetch('/submit_answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: question,
                    answer: answer
                })
            });

            yesBtn.disabled = false;
            noBtn.disabled = false;
            
            askQuestion();
        } catch (error) {
            console.error('Error:', error);
            yesBtn.disabled = false;
            noBtn.disabled = false;
        }
    }

    async function learnNewItem(itemName) {
        try {
            teachBtn.disabled = true;
            const response = await fetch('/learn_item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    item_name: itemName
                })
            });
            const data = await response.json();
            if (data.status === 'success') {
                showNotification('Thank you! I learned about: ' + itemName);
                setTimeout(resetGame, 2000);
            }
        } catch (error) {
            console.error('Error:', error);
            teachBtn.disabled = false;
        }
    }

    function showGuess(guess) {
        hideElement(questionArea);
        hideElement(learningArea);
        
        // Prepare the result area but keep it hidden
        finalGuess.textContent = guess.charAt(0).toUpperCase() + guess.slice(1);
        showElement(resultArea, true);

        // Add dramatic reveal effect
        const crystalBall = document.querySelector('.crystal-ball');
        crystalBall.style.animation = 'glow 2s ease-in-out infinite alternate';
    }

    function showLearningArea() {
        hideElement(questionArea);
        hideElement(resultArea);
        showElement(learningArea, true);
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function resetGame() {
        questionCount = 0;
        updateProgress();
        location.reload();
    }

    // Event Listeners
    yesBtn.addEventListener('click', () => {
        yesBtn.classList.add('button-press');
        setTimeout(() => yesBtn.classList.remove('button-press'), 200);
        submitAnswer('yes');
    });

    noBtn.addEventListener('click', () => {
        noBtn.classList.add('button-press');
        setTimeout(() => noBtn.classList.remove('button-press'), 200);
        submitAnswer('no');
    });

    playAgainBtn.addEventListener('click', resetGame);
    skipLearningBtn.addEventListener('click', resetGame);
    
    teachBtn.addEventListener('click', () => {
        const newItem = newItemInput.value.trim();
        if (newItem) {
            learnNewItem(newItem);
        }
    });

    newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const newItem = newItemInput.value.trim();
            if (newItem) {
                learnNewItem(newItem);
            }
        }
    });

    // Add these styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: var(--primary-color);
            color: white;
            border-radius: 10px;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            z-index: 1000;
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        .button-press {
            transform: scale(0.95) !important;
        }
    `;
    document.head.appendChild(style);
});