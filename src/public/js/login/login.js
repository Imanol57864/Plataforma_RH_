// login.js
function logInLogic() {
    return {
        email: '',
        password: '',
        remember: false,
        showPassword: false,
        isLoading: false,
        errorMessage: '',

        async logIn() {
            this.errorMessage = ''; // Limpiar mensaje previo

            const email = this.email.trim();
            const password = this.password.trim();
            const remember = this.remember;

            const isEmailValid = validator.isEmail(email);
            const isPasswordShort = validator.isLength(String(password), { max: 33 });
            const isEmailShort = validator.isLength(String(email), { max: 54 });

            if (!email || !password || !isEmailValid || !isPasswordShort || !isEmailShort) {
                this.errorMessage = 'Asegúrate de llenar todos los campos correctamente.';
                this.isLoading = false;
                return;
            }

            this.isLoading = true;
            let error_message = '';

            try {
                const response = await fetch(`${NGINX_TAG}${URL_TAG}/login/postAuth`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password, remember })
                });
                const data = await response.json();
                error_message = data.message;
                if (!response.ok || !data.success) throw new Error;
                if (data.success) window.location.href = `${NGINX_TAG}${URL_TAG}/inicio`;
            } catch (error) {
                this.errorMessage = error_message;
            } finally {
                this.isLoading = false;
            }
        },

        init() {
            // Add event listener for 'Enter' key press
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !this.isLoading) {
                    event.preventDefault();
                    this.logIn();
                }
            });
        }
    };
}