
const quizType = document.body.dataset.quiz || 'default';
const fiziCsvPath = document.body.dataset.csv || 'questions.csv';
const biochemClosePath = document.body.dataset.csvClose;
const biochemOpenPath = document.body.dataset.csvOpen;


function parseMcqCSV(text) {
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

        if (values.length < 8) continue;

        const id = parseInt(values[0], 10);
        const question = values[1].trim();

        const options = {
            A: values[2].trim(),
            B: values[3].trim(),
            C: values[4].trim(),
            D: values[5].trim(),
            E: values[6].trim(),
        };

        const correct = values[7].trim();

        result.push({ id, question, options, correct });
    }

    return result;
}

function parseBiochemOpenCSV(text) {
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

        // Expect at least 3 columns: ID, Question, Correct
        if (values.length < 3) continue;

        const id = parseInt(values[0], 10);
        const question = values[1].trim();
        const correct = values[2].trim();

        result.push({ id, question, correct });
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

function normalizeAnswer(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/\s*,\s*/g, ',') // "1, 2,3" => "1,2,3"
        .replace(/\s+/g, ' '); // multiple spaces => single space
}

// Split "a or b or c" into ["a","b","c"] and normalize each
function getCorrectVariants(raw) {
    return raw
        .split(/\s+or\s+/i) // split on "or"
        .map(part => normalizeAnswer(part))
        .filter(part => part.length > 0);
}

function renderMcqQuestions(questions, startIndex) {
    const container = document.getElementById('questions-container');

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.type = 'mcq';
        card.dataset.correct = q.correct;

        const qText = document.createElement('p');
        qText.className = 'question-text';
        // e.g. "3) (12) Question text..."
        qText.textContent = startIndex + index + 1 + ') ' + q.question;
        card.appendChild(qText);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';

        Object.entries(q.options).forEach(([key, val]) => {
            const label = document.createElement('label');
            label.className = 'option-label';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'q' + (startIndex + index);
            input.value = key;

            label.appendChild(input);
            label.appendChild(document.createTextNode(key + ': ' + val));

            optionsDiv.appendChild(label);
        });

        card.appendChild(optionsDiv);
        container.appendChild(card);
    });
}

function renderBiochemOpenQuestions(questions, startIndex) {
    const container = document.getElementById('questions-container');

    questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.dataset.type = 'biochem-open';
        card.dataset.correct = q.correct; // raw string with "or" variants

        const qText = document.createElement('p');
        qText.className = 'question-text';
        qText.textContent = startIndex + index + 1 + ') ' + q.id + '. ' + q.question;
        card.appendChild(qText);

        const textarea = document.createElement('textarea');
        textarea.className = 'open-answer';
        textarea.placeholder = 'Cavabı buraya yaz...';
        card.appendChild(textarea);

        container.appendChild(card);
    });
}

function showScoreModal(correct, total) {
    const overlay = document.getElementById('score-modal-overlay');
    const textEl = document.getElementById('score-text');
    const percentEl = document.getElementById('score-percent');
    const gaugeFill = document.getElementById('gauge-fill');

    if (!overlay || !textEl || !percentEl || !gaugeFill) return;

    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    textEl.textContent = `Bal: ${correct} / ${total}`;
    percentEl.textContent = percent + '%';

    const ARC_LENGTH = 126; // must match stroke-dasharray in CSS
    const offset = ARC_LENGTH * (1 - percent / 100);
    gaugeFill.style.strokeDashoffset = offset;

    overlay.style.display = 'flex';
}


function checkAnswers() {
    const cards = document.querySelectorAll('.question-card');
    let unanswered = 0;
    let correctCount = 0;
    let autoCount = 0; 

    cards.forEach(card => {
        const type = card.dataset.type || 'mcq';

        if (type === 'mcq') {
            autoCount++;
            const selected = card.querySelector('input[type="radio"]:checked');
            if (!selected) unanswered++;
        } else if (type === 'biochem-open') {
            autoCount++;
            const ta = card.querySelector('textarea.open-answer');
            if (!ta || !ta.value.trim()) unanswered++;
        }
    });

    if (unanswered > 0) {
        alert('Please answer all questions before checking.');
        return;
    }

    // Second pass: grade
    cards.forEach(card => {
        const type = card.dataset.type || 'mcq';

        if (type === 'mcq') {
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
        } else if (type === 'biochem-open') {
            const rawCorrect = card.dataset.correct || '';
            const variants = getCorrectVariants(rawCorrect); // [v1,v2,...]
            const ta = card.querySelector('textarea.open-answer');
            const userNorm = normalizeAnswer(ta.value || '');

            const isCorrect = variants.some(v => v === userNorm);

            if (isCorrect) {
                correctCount++;
                ta.classList.add('correct-answer');
            } else {
                ta.classList.add('incorrect-answer');
            }

            ta.disabled = true;
        }
    });

    const scoreContainer = document.getElementById('score-container');
    const bottomScore = document.getElementById('bottom-score-container');
    const text = `Your score (auto-graded): ${correctCount} / ${autoCount}.`;

    if (scoreContainer) scoreContainer.textContent = text;
    if (bottomScore) bottomScore.textContent = text;

    // show nice modal
    showScoreModal(correctCount, autoCount);

    const checkBtn = document.getElementById('check-button');
    const reloadBtn = document.getElementById('reload-button');
    if (checkBtn) checkBtn.disabled = true;
    if (reloadBtn) reloadBtn.style.display = 'inline-block';
}

// -------------------- INIT --------------------

function initFiziologiyaQuiz() {
    fetch(fiziCsvPath)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load CSV file: ' + fiziCsvPath);
            }
            return response.text();
        })
        .then(text => {
            const allQuestions = parseMcqCSV(text);
            if (allQuestions.length === 0) {
                throw new Error('No questions found in ' + fiziCsvPath);
            }
            const selected = getRandomQuestions(allQuestions, Math.min(25, allQuestions.length));
            renderMcqQuestions(selected, 0);
            const qc = document.getElementById('questions-container');
            if (qc) qc.style.display = 'block';
        })
        .catch(err => {
            const scoreContainer = document.getElementById('score-container');
            if (scoreContainer) {
                scoreContainer.style.color = 'red';
                scoreContainer.textContent = err.message;
            }
            console.error(err);
        })
        .finally(() => {
            const checkBtn = document.getElementById('check-button');
            const reloadBtn = document.getElementById('reload-button');
            if (checkBtn) checkBtn.addEventListener('click', checkAnswers);
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    window.location.reload();
                });
            }
        });
}

function initBiokimyaQuiz() {
    if (!biochemClosePath || !biochemOpenPath) {
        const scoreContainer = document.getElementById('score-container');
        if (scoreContainer) {
            scoreContainer.style.color = 'red';
            scoreContainer.textContent = 'Biokimya CSV paths are not configured.';
        }
        return;
    }

    Promise.all([fetch(biochemClosePath), fetch(biochemOpenPath)])
        .then(async ([resClose, resOpen]) => {
            if (!resClose.ok) {
                throw new Error('Failed to load ' + biochemClosePath);
            }
            if (!resOpen.ok) {
                throw new Error('Failed to load ' + biochemOpenPath);
            }

            const [textClose, textOpen] = await Promise.all([resClose.text(), resOpen.text()]);

            const allClose = parseMcqCSV(textClose); // 8-col MCQ
            const allOpen = parseBiochemOpenCSV(textOpen); // 3-col text

            if (allClose.length === 0) {
                throw new Error('No close-ended questions in ' + biochemClosePath);
            }
            if (allOpen.length === 0) {
                throw new Error('No open-ended questions in ' + biochemOpenPath);
            }

            const selectedClose = getRandomQuestions(allClose, Math.min(15, allClose.length));
            const selectedOpen = getRandomQuestions(allOpen, Math.min(10, allOpen.length));

            renderMcqQuestions(selectedClose, 0);
            renderBiochemOpenQuestions(selectedOpen, selectedClose.length);

            const qc = document.getElementById('questions-container');
            if (qc) qc.style.display = 'block';
        })
        .catch(err => {
            const scoreContainer = document.getElementById('score-container');
            if (scoreContainer) {
                scoreContainer.style.color = 'red';
                scoreContainer.textContent = err.message;
            }
            console.error(err);
        })
        .finally(() => {
            const checkBtn = document.getElementById('check-button');
            const reloadBtn = document.getElementById('reload-button');
            if (checkBtn) checkBtn.addEventListener('click', checkAnswers);
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    window.location.reload();
                });
            }
        });
}

document.addEventListener('DOMContentLoaded', () => {
    if (quizType === 'biokimya') {
        initBiokimyaQuiz();
    } else {
        initFiziologiyaQuiz();
    }

    // modal close handlers
    const overlay = document.getElementById('score-modal-overlay');
    const closeBtn = document.getElementById('score-modal-close');

    if (closeBtn && overlay) {
        closeBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });
    }
    if (overlay) {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    }
});
