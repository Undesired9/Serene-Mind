const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const LICENSE_PATTERN = /^[A-Za-z0-9/-][A-Za-z0-9/ -]*$/;

export const authConstraints = {
    username: '3-24 characters using letters, numbers, dots, underscores, or hyphens.',
    password: '8-64 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 number.'
};

export const validateUsername = (value, label = 'Username') => {
    const username = value.trim();

    if (!username) return `${label} is required`;
    if (username.length < 3 || username.length > 24) {
        return `${label} must be 3-24 characters long`;
    }
    if (!USERNAME_PATTERN.test(username)) {
        return `${label} can only contain letters, numbers, dots, underscores, and hyphens`;
    }
    return '';
};

export const validateEmail = (value) => {
    const email = value.trim();

    if (!email) return 'Email is required';
    if (email.length > 254) return 'Email is too long';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
    return '';
};

export const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 8 || value.length > 64) {
        return 'Password must be 8-64 characters long';
    }
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
        return 'Password must include uppercase, lowercase, and a number';
    }
    return '';
};

export const validateFullName = (value) => {
    const fullName = value.trim();

    if (!fullName) return 'Full name is required';
    if (fullName.length < 2 || fullName.length > 80) {
        return 'Full name must be 2-80 characters long';
    }
    return '';
};

export const validateLicenseNumber = (value) => {
    const licenseNumber = value.trim();

    if (!licenseNumber) return '';
    if (licenseNumber.length > 40) return 'License number is too long';
    if (!LICENSE_PATTERN.test(licenseNumber)) {
        return 'License number can only contain letters, numbers, spaces, slashes, and hyphens';
    }
    return '';
};

export const validateLoginForm = ({ identifier, password }) => {
    const loginId = identifier.trim();

    if (!loginId) return 'Enter your username or email';
    if (loginId.length < 3 || loginId.length > 254) {
        return 'Username or email must be 3-254 characters long';
    }
    if (!password) return 'Password is required';
    if (password.length > 64) return 'Password is too long';
    return '';
};

export const validateRegisterForm = (formData, { isDoctor = false } = {}) => {
    if (isDoctor) {
        const fullNameError = validateFullName(formData.fullName || '');
        if (fullNameError) return fullNameError;
    }

    const usernameError = validateUsername(formData.username || '');
    if (usernameError) return usernameError;

    const emailError = validateEmail(formData.email || '');
    if (emailError) return emailError;

    const passwordError = validatePassword(formData.password || '');
    if (passwordError) return passwordError;

    if (!formData.confirmPassword) return 'Please confirm your password';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';

    if (isDoctor) {
        const licenseError = validateLicenseNumber(formData.licenseNumber || '');
        if (licenseError) return licenseError;
    }

    return '';
};
