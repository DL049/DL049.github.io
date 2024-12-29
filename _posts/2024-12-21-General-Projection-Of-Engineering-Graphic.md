---
title: 投影學的數學建模：通用投影
date: 2024-12-21 17:30:00 +/+0800
description: Mathematical Model for 2D Projection in Engineering Graphic
categories: [Derivation]
tags: [mathematic,engineering_graphic]     # TAG names should always be lowercase
math: true
toc: true
---
## 前言
這是一篇大一時對工程圖學基本概念的數學建模。從紙本遷移過來，因此不會太嚴謹。本意是爲了寫程序確認自己的工程圖學作業是否合理。原文是基於我更早推導的正投影的數學建模公式的廣義推廣（從正投影推廣到所有投影）

## The Basic Concept
The basic concept is to create a function that takes 6 variables and produces a 2D point that can be shown in the projection coordinate. The definition can be described as follows:  

\\[
    GP(a, b, f, m, c, s) = 
    \\begin{bmatrix}
    w\\\\
    h
    \\end{bmatrix}
\\]  

Where:
- \\(a, b\\) are the points that need to be projected (called \\(P_1\\)),
- \\(f\\) is the length of data that is not included by the projected point (\\(P_1\\)),
- \\(m, c\\) are the factor and constant used to describe the projection line, \\(y = mx + c\\),
- \\(s\\) is the variable describing the side properties.

## Distinction Between Projection Coordinates and Cartesian Coordinates System
Before deriving the formula, there are different coordinate systems used in different fields. To remove differences and simplify calculations, we use a vector table \\((j, k)\\) in the Cartesian system and convert it into projection coordinates \\((l, o)\\) by multiplying by a transformation matrix \\(T\\):  

\\[
    \\begin{bmatrix}
    j \\ k
    \\end{bmatrix}
    \\times
    \\begin{bmatrix}
        -1  \\ 0 \\\\ 
        0 \\ 1
    \\end{bmatrix}
    =
    \\begin{bmatrix}
    l \\ o
    \\end{bmatrix}
\\]
    \\(T\\) is defined as
\\[
    \\begin{bmatrix}
        -1  \\ 0 \\\\ 
        0 \\ 1
    \\end{bmatrix}
\\]
(The coordinate of projection is referenced by the NCKU's standard.)

## The Vector Form Modeling
The simplified model to achieve the results can be described by the vector form:
\\[
    P_2 = P_0 + s \\cdot \\Delta P \\cdot T
\\]  

Here:
- \\(P_2\\) is the output projection point,
- \\(P_0\\) is the point that extends \\(P_1\\) perpendicular to the projection line until they intersect,
- \\(\\Delta P\\) is the vector perpendicular to the projection line that extends length \\(f\\) and to the direction of the side opposite to \\(P_1\\).

## Solution of \\(P_0\\)
To solve the expression for \\(P_0\\), we use the following equations:

Given that \\(P_1\\) is extended perpendicular until it intersects the projection line, \\(P_1\\) is the solution of:
\\[
    y = mx + c \\tag{1}
\\]  
Since \\(P_1\\) is extended perpendicular to the projection line, the extended line has a gradient \\(m_2\\) such that \\(m \\cdot m_2 = -1\\). Therefore,
\\[
    l_2: (y - b) = m_2(x - a)
\\]  
and thus,
\\[
    y = \\frac{-x}{m} + \\frac{a}{m} + b
\\]  
Combining (1) and (2):
\\[
    \\frac{-x}{m} + \\frac{a}{m} + b = mx + c
\\]  
\\[
    \\Rightarrow \\frac{a}{m} + b - c = (m + \\frac{1}{m})x
\\]  
\\[
    \\Rightarrow x = \\frac{\\frac{a}{m} + b - c}{m+\\frac{1}{m}}
\\]  
\\[
    \\Rightarrow x = \\frac{mb - mc + a}{m^2 + 1}
\\]

## The Solution of \\(\\Delta P\\)
The definition of \\(\\Delta P\\) is the vector that extends length \\(f\\) to the side opposite to \\(P_1\\). Using the Pythagorean theorem:
\\[
    (\\Delta P)^2 = f^2 = ( \\Delta a)^2 + (\\Delta b)^2
\\]  
Thus:
\\[
    \\alpha = 90^\\circ - \\tan^{-1}(m),
\\]
\\[
    \\Delta P = f \\cdot
    \\begin{bmatrix}
        \\cos(90^\\circ - \\tan^{-1}(m)) \\\\ 
        \\sin(90^\\circ - \\tan^{-1}(m))
    \\end{bmatrix}
\\]
\\[
    \\Delta P = f \\cdot
    \\begin{bmatrix}
        \\frac{m}{\\sqrt{m^2+1}} \\\\ 
        \\frac{1}{\\sqrt{m^2+1}} 
    \\end{bmatrix}
\\]
## Conclusion
By combining Sections 1-5, the general projection function is shown below:
\\[
GP(a, b, f, m, c, s) = 
\\begin{bmatrix}
\\frac{mb - mc + a}{m^2 + 1} - s \\cdot f \\cdot \\frac{m}{\\sqrt{m^2 + 1}} \\\\ 
\\left(\\frac{mb - mc + a}{m^2 + 1}\\right) m + c + s \\cdot f \\cdot \\frac{1}{\\sqrt{m^2 + 1}}
\\end{bmatrix}
\\]

Simplified:
\\[
GP(a, b, f, m, c, s) = 
\\begin{bmatrix}
\\frac{mb-mc+a-s \\cdot f \\cdot m \\cdot \\sqrt{m^2+1}}{m^2+1}
\\frac{m^2 b+ma+c + s \\cdot f\\cdot \\sqrt{m^2+1}}{m^2+1}
\\end{bmatrix}
\\] 