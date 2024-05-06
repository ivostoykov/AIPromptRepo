class AIPromptRepo extends HTMLElement {
    constructor() {
        self = super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                /* Styles here */
            </style>
            <div>
                <p>Content of ai-prompt-repo component</p>
            </div>
        `;

        // Simulate the component being ready (load event)
        setTimeout(() => {
            this.dispatchEvent(new CustomEvent('load', {
                bubbles: true,
                detail: { message: 'AIPromptRepo is loaded!' }
            }));
        }, 0);
    }

    connectedCallback() {
        // const shadow = this.attachShadow({ mode: "open" });
        const buttonStyle = getMainButtonStyle();
        // const button = getMainButton();
        // const sidebarStyle = getSidebarStyle();
        // const sidebar = getSidebar();

        this.shadow.appendChild(buttonStyle);

        this.dispatchEvent(new CustomEvent('update', {
            bubbles: true,
            detail: { message: 'AIPromptRepo has been updated!' }
        }));

        // Simulate a change event listener setup (for demo purposes)
        this.addEventListener('change', this.handleChange);
    }

    disconnectedCallback() {
        // Clean up event listeners when the component is removed from the DOM
        this.removeEventListener('change', this.handleChange);
    }

    handleChange(event) {
        // Handle change events internally
        console.log('Change event triggered', event.detail);
    }

    emitError() {
        // Method to emit an error event manually
        this.dispatchEvent(new CustomEvent('error', {
            bubbles: true,
            detail: { message: 'An error occurred in AIPromptRepo!' }
        }));
    }

    getMainButtonStyle = () => {
        const linkElem = document.createElement("link");
        linkElem.setAttribute("rel", "stylesheet");
        linkElem.setAttribute("href", "button.css");
        return linkElem;
    };

    getMainButton = () => {};
    getSidebarStyle = () => {};
    getSidebar = () => {};
}

customElements.define('ai-prompt-repo', AIPromptRepo);
