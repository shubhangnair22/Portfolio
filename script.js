var heading = document.querySelector('h1');
heading.addEventListener('mouseenter', function () {
    this.style.color = 'coral';
});
heading.addEventListener('mouseout', function () {
    this.style.color = '';
});
