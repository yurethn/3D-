# FLYFORMER LAB 3D

Educational 3D school classroom with flies sitting at desks and answering a chalkboard prompt. Switch GPT next-token and BERT masked-token modes; view real attention weights and predicted choice probabilities; train an output classifier using SGD. Rotate camera and change problems.

Implementation: single static HTML file; Three.js ESM 0.180.0 from CDN (network required). WebGL required.

Scientific disclosure: the teaching model computes deterministic Q, K and V attention and actually trains its output layer via stochastic gradient descent on 12 examples per mode. It is NOT a pretrained GPT or BERT, and reported accuracy is training-set accuracy. Free-form questions have no ground truth, and only three demonstration candidates are classified.

Deploy: static site, Framework Other, no build command.