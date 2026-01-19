/* const CSV_PATH = 'questions.csv';

// Parse CSV text into an array of question objects. This function

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    // Expect at least one header and one data line
    if (lines.length < 2) return [];
    // Skip header
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Split CSV line into fields while respecting quoted commas
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                // Toggle quote state. Handles escaped quotes by doubling.
                if (j + 1 < line.length && line[j + 1] === '"') {
                    current += '"';
                    j++; // skip the escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        // Guard against malformed lines
        if (values.length < 9) continue;
        const id = parseInt(values[0], 10);
        const question = values[1].trim();
        // values[2] is Mövzu (topic) – ignored
        const options = {
            A: values[3].trim(),
            B: values[4].trim(),
            C: values[5].trim(),
            D: values[6].trim(),
            E: values[7].trim(),
        };
        const correct = values[8].trim();
        result.push({ id, question, options, correct });
    }
    return result;
}

// Return an array of n unique random questions from the given pool.

function getRandomQuestions(pool, count) {
    const shuffled = pool.slice();
    // Fisher–Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

// Render the selected questions to the page. Each question card
function renderQuestions(questions) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    questions.forEach((q, index) => {
        // Create outer card
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.correct = q.correct;
        // Display question number and text
        const qText = document.createElement('p');
        qText.className = 'question-text';
        // Displaying the actual index (1–25) rather than q.id provides a
        // consistent numbering for the user when randomizing.
        qText.textContent = index + 1 + ') ' + q.question;
        card.appendChild(qText);
        // Container for the options
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';
        // Iterate over options A–E
        Object.entries(q.options).forEach(([key, val]) => {
            const label = document.createElement('label');
            label.className = 'option-label';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'q' + index; // ensures unique group per question
            input.value = key;
            // Append input and text to label
            label.appendChild(input);
            const textNode = document.createTextNode(key + ': ' + val);
            label.appendChild(textNode);
            // Wrap label inside a div for easier styling
            optionsDiv.appendChild(label);
        });
        card.appendChild(optionsDiv);
        container.appendChild(card);
    });
}

// Evaluate answers when the user clicks "Check answers".
function checkAnswers() {
    const cards = document.querySelectorAll('.question-card');
    let unanswered = 0;
    let correctCount = 0;

    cards.forEach(card => {
        const selected = card.querySelector('input[type="radio"]:checked');
        if (!selected) {
            unanswered++;
        }
    });

    // If any question is unanswered, show alert and abort
    if (unanswered > 0) {
        alert('Please answer all questions before checking.');
        return;
    }

    // All questions answered; evaluate each
    cards.forEach(card => {
        const correct = card.dataset.correct;
        const options = card.querySelectorAll('.option-label');
        let userAnswer = null;
        // Determine which option was selected
        options.forEach(label => {
            const input = label.querySelector('input');
            if (input.checked) {
                userAnswer = input.value;
            }
            // Reset any previous highlight classes (in case of reload)
            label.classList.remove('correct-answer', 'incorrect-answer');
        });
        // Highlight the correct option in green
        options.forEach(label => {
            const input = label.querySelector('input');
            if (input.value === correct) {
                label.classList.add('correct-answer');
            }
        });
        // If user's answer matches the correct answer, count it
        if (userAnswer === correct) {
            correctCount++;
        } else {
            // Highlight the user's chosen option in red if incorrect
            options.forEach(label => {
                const input = label.querySelector('input');
                if (input.checked && input.value !== correct) {
                    label.classList.add('incorrect-answer');
                }
            });
        }
        // Disable all inputs to prevent further changes
        options.forEach(label => {
            const input = label.querySelector('input');
            input.disabled = true;
        });
    });

    // Show the score at the top and bottom
    const scoreContainer = document.getElementById('score-container');
    scoreContainer.textContent = 'Your score: ' + correctCount + ' / ' + cards.length;
    document.getElementById('bottom-score-container').textContent = 'Your score: ' + correctCount + ' / ' + cards.length;

    // Disable the check button and reveal reload button
    document.getElementById('check-button').disabled = true;
    document.getElementById('reload-button').style.display = 'inline-block';
}

// On initial page load, fetch and parse the CSV, then render 25 random questions
function initQuiz() {
    fetch(CSV_PATH)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load CSV file. Make sure questions.csv is in the same folder or adjust CSV_PATH.');
            }
            return response.text();
        })
        .then(text => {
            const allQuestions = parseCSV(text);
            if (allQuestions.length === 0) {
                throw new Error('No questions found in CSV.');
            }
            const selected = getRandomQuestions(allQuestions, Math.min(25, allQuestions.length));
            renderQuestions(selected);
            // show questions container once loaded
            document.getElementById('questions-container').style.display = 'block';
        })
        .catch(err => {
            const scoreContainer = document.getElementById('score-container');
            scoreContainer.style.color = 'red';
            scoreContainer.textContent = err.message;
        })
        .finally(() => {
            document.getElementById('check-button').addEventListener('click', checkAnswers);
            document.getElementById('reload-button').addEventListener('click', () => {
                window.location.reload();
            });
        });
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('token-button');
    const input = document.getElementById('token-input');
    const errorEl = document.getElementById('token-error');

    btn.addEventListener('click', submitToken);

    // Handle Enter key on the input
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            submitToken();
        }
    });

    async function submitToken() {
        const token = input.value.trim();
        if (!token) {
            errorEl.textContent = 'Please enter a token.';
            errorEl.style.display = 'block';
            return;
        }

        try {
            errorEl.style.display = 'none';

            const res = await fetch('/api/check-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                errorEl.textContent = data.error || 'Token not accepted.';
                errorEl.style.display = 'block';
                return;
            }

            // Hide login, show quiz
            document.getElementById('login-container').style.display = 'none';

            // Now load questions
            initQuiz();
        } catch (err) {
            console.error(err);
            errorEl.textContent = 'Something went wrong. Try again.';
            errorEl.style.display = 'block';
        }
    }
});
*/

// login.js
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('token-input');
    const button = document.getElementById('token-button');
    const error = document.getElementById('token-error');

    button.addEventListener('click', submitToken);

    // Handle Enter key on the input
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            submitToken();
        }
    });

    async function submitToken() {
        const token = input.value.trim();

        if (!token) {
            error.textContent = 'Tokeni daxil et.';
            error.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/api/check-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (!res.ok) {
                throw new Error('Server error while checking token.');
            }

            const data = await res.json();

            if (data.ok) {
                const sessionToken = crypto.randomUUID();
                localStorage.setItem('quiz-session', sessionToken);
                window.location.href = 'select-quiz.html';
                
            } else {
                error.textContent = 'Yanlış token';
                error.style.display = 'block';
            }
        } catch (e) {
            console.error(e);
            error.textContent = 'Yanlış token yenidən cəhd et';
            error.style.display = 'block';
        }
    }
});
