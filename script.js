const sections = document.querySelectorAll('.section');
let currentIndex = 0;
let isScrolling = false;

// Hamburger menu toggle
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });

  // Close menu when clicking on link
  document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
    });
  });
}

// Active section highlighting
function updateActiveLink() {
  const scrollPosition = window.scrollY + 200;
  
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionBottom = sectionTop + section.offsetHeight;
    const sectionId = section.getAttribute('id');
    
    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
      document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
          link.classList.add('active');
          // Update current page text on mobile
          const currentPageEl = document.getElementById('currentPage');
          if (currentPageEl) {
            currentPageEl.textContent = link.textContent;
          }
        }
      });
    }
  });
}

window.addEventListener('scroll', updateActiveLink);
window.addEventListener('load', updateActiveLink);

// Smooth scrolling with snap
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (isScrolling) return;

  isScrolling = true;

  if (e.deltaY > 0 && currentIndex < sections.length - 1) {
    currentIndex++;
  } else if (e.deltaY < 0 && currentIndex > 0) {
    currentIndex--;
  }

  sections[currentIndex].scrollIntoView({
    behavior: 'smooth'
  });

  setTimeout(() => {
    isScrolling = false;
  }, 900);
}, { passive: false });
