// injector.js - This script is ONLY injected on the exam website.

console.log("Injector script loaded. Watching for all question buttons.");

const questionSelectionSelector = "#question-selection";
const questionViewSelector = "#question-view";
const buttonSelector = "button[onclick^='selectQuestion']";
const waitingMessageId = "extension-waiting-message";

function showWaitingMessage() {
    const questionSelection = document.querySelector(questionSelectionSelector);
    if (questionSelection) questionSelection.style.display = 'none';
    
    const questionView = document.querySelector(questionViewSelector);
    if (questionView) questionView.style.display = 'none';

    const oldMessage = document.getElementById(waitingMessageId);
    if (oldMessage) oldMessage.remove();

    const waitingDiv = document.createElement('div');
    waitingDiv.id = waitingMessageId;
    waitingDiv.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px; border: 2px dashed #ccc;">
            <h2>Waiting for Screen Sharing</h2>
            <p>Please select a screen in the prompt to begin recording and view the question.</p>
        </div>
    `;
    questionSelection.parentNode.insertBefore(waitingDiv, questionSelection);
}

function showQuestionAndRemoveWaiting() {
    const questionView = document.querySelector(questionViewSelector);
    if (questionView) questionView.style.display = 'block';
    
    const waitingMessage = document.getElementById(waitingMessageId);
    if (waitingMessage) waitingMessage.remove();
}

function returnToQuestionSelection() {
    const questionSelection = document.querySelector(questionSelectionSelector);
    if (questionSelection) questionSelection.style.display = 'block';

    const questionView = document.querySelector(questionViewSelector);
    if (questionView) questionView.style.display = 'none';

    const waitingMessage = document.getElementById(waitingMessageId);
    if (waitingMessage) waitingMessage.remove();
}

function attachListenersToAllButtons() {
    const buttons = document.querySelectorAll(buttonSelector);
    buttons.forEach(button => {
        if (!button.hasAttribute('data-recording-listener-added')) {
            button.setAttribute('data-recording-listener-added', 'true');
            button.addEventListener('click', () => {
                showWaitingMessage();
                window.dispatchEvent(new CustomEvent('start-recording-event'));
            });
        }
    });
}

const observer = new MutationObserver(attachListenersToAllButtons);
observer.observe(document.body, { childList: true, subtree: true });
attachListenersToAllButtons();

window.addEventListener('recording-started-event', showQuestionAndRemoveWaiting);
window.addEventListener('recording-stopped-event', () => {
    alert("Recording has been stopped. You will now be returned to the questions list.");
    returnToQuestionSelection();
    if (typeof showAvailableQuestions === 'function') {
        showAvailableQuestions();
    }
});
