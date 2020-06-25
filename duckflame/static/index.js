document.addEventListener('animationend', anation => {
    const elem = anation.target;
    if (elem.className === "headFirst") {
        document.querySelector(".headSecond").style.animationPlayState = "running";
    }
    if (elem.className === "headSecond") {
        document.querySelector(".subhead").style.animationPlayState = "running";
    }
});
