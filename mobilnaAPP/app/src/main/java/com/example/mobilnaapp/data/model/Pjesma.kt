package com.example.mobilnaapp.data.model

data class Pjesma(
    val id: Long,
    val naziv: String,
    val opis: String?,
    val putanjaAudio: String?,
    val putanjaSlika: String?
)
