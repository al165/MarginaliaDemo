function splitArea(leftSplit, cut, vertical, offset) {
    leftSplit.classList.remove("grow");

    let mainAxisN = vertical ? "left" : "top";
    let mainAxisP = vertical ? "right" : "bottom";
    let crossAxisN = vertical ? "top" : "left";
    let scrollMainAxis = vertical ? scrollX : scrollY;
    let scrollCrossAxis = vertical ? scrollY : scrollX;
    let mainDim = vertical ? "width" : "height";
    let crossDim = vertical ? "height" : "width";

    const areaRect = leftSplit.getBoundingClientRect();

    const contentLeft = leftSplit.querySelector(".content");
    const contentRect = contentLeft.getBoundingClientRect();

    const contentRight = contentLeft.cloneNode(true);
    updateNoteLinks(contentRight);

    contentLeft.style[mainAxisN] = contentRect[mainAxisN] - areaRect[mainAxisN] + "px";
    contentLeft.style[mainAxisP] = null;

    // if (vertical) {
    //     moveOutOfTheWayHorizontalOf(leftSplit, true, offset);
    // } else {
    //     moveOutOfTheWayVerticalOf(leftSplit, true, offset);
    // }
    leftSplit.style[mainAxisN] = areaRect[mainAxisN] + scrollMainAxis + "px";
    leftSplit.style[mainDim] = cut + "px";

    const rightSplit = leftSplit.cloneNode(false);
    rightSplit.addEventListener('click', () => {
        rightSplit.style.zIndex = currentZIndex;
        currentZIndex++;
    });
    noteboard.appendChild(rightSplit);
    rightSplit.appendChild(contentRight);
    contentRight.style[mainAxisP] = areaRect[mainAxisP] - contentRect[mainAxisP] + "px";
    contentRight.style[mainAxisN] = null;
    rightSplit.style[crossAxisN] = areaRect[crossAxisN] + scrollCrossAxis + "px";
    rightSplit.style[mainDim] = (areaRect[mainDim] - cut) + "px";
    rightSplit.style[crossDim] = areaRect[crossDim] + "px";

    rightSplit.style[mainAxisN] = areaRect[mainAxisN] + scrollMainAxis + cut + "px";
    if (vertical) {
        moveOutOfTheWayHorizontalOf(rightSplit, false);
    } else {
        moveOutOfTheWayVerticalOf(rightSplit, false);
    }
    rightSplit.offsetHeight;
    rightSplit.style[mainAxisN] = areaRect[mainAxisN] + scrollMainAxis + cut + offset + "px";

    if (vertical) {
        // window.scrollTo(scrollX, screenY + offset);
        window.scrollBy({ top: offset / 4, behavior: "smooth" });
    } else {
        // window.scrollTo(scrollX + offset, scrollY);
        window.scrollBy({ left: offset / 4, behavior: "smooth" });

    }

    return { leftSplit, rightSplit }
}