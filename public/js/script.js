// Chức năng đăng nhập (lưu thông tin và chuyển hướng)
document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.querySelector('#username').value;
    const password = document.querySelector('#password').value;

    if (username === 'admin' && password === 'admin123') {
        window.location.href = 'dashboard.html'; // Chuyển hướng đến Dashboard nếu đăng nhập đúng
    } else {
        alert('Thông tin đăng nhập không đúng');
    }
});