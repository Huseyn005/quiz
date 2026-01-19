// quiz.js

// Read CSV path from body attribute, default to questions.csv
const CSV_PATH = document.body.dataset.csv;

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                if (j + 1 < line.length && line[j + 1] === '"') {
                    current += '"';
                    j++;
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

        if (values.length < 9) continue;

        const id = parseInt(values[0], 10);
        const question = values[1].trim();
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

function getRandomQuestions(pool, count) {
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function renderQuestions(questions) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.correct = q.correct;

        const qText = document.createElement('p');
        qText.className = 'question-text';
        qText.textContent = index + 1 + ') ' + q.question;
        card.appendChild(qText);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';

        Object.entries(q.options).forEach(([key, val]) => {
            const label = document.createElement('label');
            label.className = 'option-label';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'q' + index;
            input.value = key;

            label.appendChild(input);
            label.appendChild(document.createTextNode(key + ': ' + val));
            optionsDiv.appendChild(label);
        });

        card.appendChild(optionsDiv);
        container.appendChild(card);
    });
}

function checkAnswers() {
    const cards = document.querySelectorAll('.question-card');
    let unanswered = 0;
    let correctCount = 0;

    cards.forEach(card => {
        const selected = card.querySelector('input[type="radio"]:checked');
        if (!selected) unanswered++;
    });

    if (unanswered > 0) {
        alert('Please answer all questions before checking.');
        return;
    }

    cards.forEach(card => {
        const correct = card.dataset.correct;
        const options = card.querySelectorAll('.option-label');
        let userAnswer = null;

        options.forEach(label => {
            const input = label.querySelector('input');
            if (input.checked) userAnswer = input.value;
            label.classList.remove('correct-answer', 'incorrect-answer');
        });

        options.forEach(label => {
            const input = label.querySelector('input');
            if (input.value === correct) {
                label.classList.add('correct-answer');
            }
        });

        if (userAnswer === correct) {
            correctCount++;
        } else {
            options.forEach(label => {
                const input = label.querySelector('input');
                if (input.checked && input.value !== correct) {
                    label.classList.add('incorrect-answer');
                }
            });
        }

        options.forEach(label => {
            label.querySelector('input').disabled = true;
        });
    });

    const scoreContainer = document.getElementById('score-container');
    scoreContainer.textContent = 'Your score: ' + correctCount + ' / ' + cards.length;
    document.getElementById('bottom-score-container').textContent =
        'Your score: ' + correctCount + ' / ' + cards.length;

    document.getElementById('check-button').disabled = true;
    document.getElementById('reload-button').style.display = 'inline-block';
}

document.addEventListener('DOMContentLoaded', () => {
    // Optional: block direct access if token not validated
    if (localStorage.getItem('quiz-token-ok') !== 'true') {
        // If you want, redirect back to login:
        // window.location.href = 'index.html';
        console.warn('No token found in localStorage – quiz is still accessible but not protected.');
    }

    fetch(CSV_PATH)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load CSV file: ' + CSV_PATH);
            }
            return response.text();
        })
        .then(text => {
            const allQuestions = parseCSV(text);
            if (allQuestions.length === 0) {
                throw new Error('No questions found in CSV ' + CSV_PATH);
            }
            const selected = getRandomQuestions(allQuestions, Math.min(25, allQuestions.length));
            renderQuestions(selected);
        })
        .catch(err => {
            const scoreContainer = document.getElementById('score-container');
            scoreContainer.style.color = 'red';
            scoreContainer.textContent = err.message;
            console.error(err);
        })
        .finally(() => {
            document.getElementById('check-button').addEventListener('click', checkAnswers);
            document.getElementById('reload-button').addEventListener('click', () => {
                window.location.reload();
            });
        });
});
