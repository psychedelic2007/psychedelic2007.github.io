// <!-- typed js effect starts -->
var typed = new Typed(".home .typing-text", {
    strings: ["Circadian Research", "Tutoring", "Developing Ed Tech", "Webserver Development"],
    loop: true,
    typeSpeed: 50,
    backSpeed: 25,
    backDelay: 500,
});
// <!-- typed js effect ends -->

/*================================================toggle icon navbar===================================*/
let menuIcon = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');

menuIcon.onclick = () => {
    menuIcon.classList.toggle('bx-x');
    navbar.classList.toggle('active');
};

/*===============================================scroll selection active link==========================*/
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

window.onscroll = () => {
    sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');

        if(top >= offset && top < offset + height) {
            navLinks.forEach(links => {
                links.classList.remove('active');
                document.querySelector('header nav a[href*=' + id + ']').classList.add('active');
            });
        };
    });
    let header = document.querySelector('header');
    header.classList.toggle('sticky', window.scrollY > 100);

    /*=========================================remove toggle icon and navbar when click navbar link===================================*/
    menuIcon.classList.remove('bx-x');
    menuIcon.classList.remove('active');
};

/*====================================================Scroll Reveal====================================================================*/
ScrollReveal({
    distance: '80px',
    duration: 2000,
    delay: 200
});

ScrollReveal().reveal('.home-content, .heading, .publication-heading, .mentor-heading, .project-heading, .skill-heading, .contact-heading', {origin: 'top'});
ScrollReveal().reveal('.publication-container, .mentor-container, .publication-box, .project-box, .contact form', {origin: 'bottom'});
ScrollReveal().reveal('.home-content h1', {origin: 'left'});
ScrollReveal().reveal('.home-content p, .about-content h3, .about-content p', {origin: 'right'});

/*===========================contact us section=====================*/
const form = document.querySelector('form');
const fullName = document.getElementById("fullName");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const subject = document.getElementById("subject");
const mess = document.getElementById("message");

function sendEmail() {
    const bodyMessage = `Full Name: ${fullName.value}<br> Email: ${email.value}<br> Phone Number: ${phone.value}<br> Message: ${mess.value}`;
    Email.send({
        Host : "smtp.elasticemail.com",
        Username : "satyamsangeet229@gmail.com",
        Password : "5C7E8AD36D28C8AF595D05C3D76CF6F0842E",
        To : 'satyamsangeet229@gmail.com',
        From : "satyamsangeet229@gmail.com",
        Subject : subject.value,
        Body : bodyMessage
    }).then(
        message => {
            if (message == "OK") {
                Swal.fire({
                    title: "Success!",
                    text: "Message Sent Successfully!",
                    icon: "Success"
                });
            }
        }
    );
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendEmail();
});