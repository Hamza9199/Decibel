package com.example.mobilnaapp.data.remote

import com.example.mobilnaapp.data.model.Pjesma
import retrofit2.http.GET

interface ApiService {
    @GET("pjesme/")
    suspend fun getPjesme(): List<Pjesma>
}
