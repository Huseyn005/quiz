
const CSV_PATH = 'questions.csv';

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
    document.getElementById('bottom-score-container').textContent =
        'Your score: ' + correctCount + ' / ' + cards.length;

    // Disable the check button and reveal reload button
    document.getElementById('check-button').disabled = true;
    document.getElementById('reload-button').style.display = 'inline-block';
}

// On initial page load, fetch and parse the CSV, then render 25 random questions
document.addEventListener('DOMContentLoaded', () => {
    // Fetch the CSV file, parse it, and then render a random subset
    fetch(CSV_PATH)
        .then(response => {
            if (!response.ok) {
                throw new Error(
                    'Failed to load CSV file. Make sure questions.csv is in the same folder or adjust CSV_PATH.'
                );
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
        })
        .catch(err => {
            // Display error message to the user in the score container
            const scoreContainer = document.getElementById('score-container');
            scoreContainer.style.color = 'red';
            scoreContainer.textContent = err.message;
        })
        .finally(() => {
            // Attach event listeners to buttons regardless of fetch outcome
            document.getElementById('check-button').addEventListener('click', checkAnswers);
            document.getElementById('reload-button').addEventListener('click', () => {
                window.location.reload();
            });
        });
});
